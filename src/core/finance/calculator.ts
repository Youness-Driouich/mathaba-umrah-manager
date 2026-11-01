import Decimal from "decimal.js";
import {
  BaselineOfferCalculationInput,
  CurrencyCode,
  ExchangeRates,
  HotelCalculationResult,
  HotelStayInput,
  IndividualExceptionInput,
  IndividualPilgrimQuoteResult,
  OfferCalculationResult,
  RoomCategoryType,
  RoomCostBreakdown,
  ROOM_OCCUPANCIES,
} from "./types";
import { convertToMad, roundCurrency } from "./currency";

/**
 * Calculates number of nights between check-in and check-out dates,
 * respecting an optional manual override.
 */
export function calculateStayNights(
  checkIn: string | Date,
  checkOut: string | Date,
  manualOverride?: number | null
): { nights: number; isOverridden: boolean } {
  if (manualOverride !== undefined && manualOverride !== null && manualOverride > 0) {
    return {
      nights: Math.floor(manualOverride),
      isOverridden: true,
    };
  }

  const dIn = typeof checkIn === "string" ? new Date(checkIn) : checkIn;
  const dOut = typeof checkOut === "string" ? new Date(checkOut) : checkOut;

  // Use UTC midnight timestamps to prevent daylight saving / timezone drift
  const utcIn = Date.UTC(dIn.getFullYear(), dIn.getMonth(), dIn.getDate());
  const utcOut = Date.UTC(dOut.getFullYear(), dOut.getMonth(), dOut.getDate());

  const msDiff = utcOut - utcIn;
  const daysDiff = Math.round(msDiff / (1000 * 60 * 60 * 24));

  if (daysDiff <= 0) {
    throw new Error(`Invalid stay dates: Check-out date must be after check-in date. Got ${daysDiff} nights.`);
  }

  return {
    nights: daysDiff,
    isOverridden: false,
  };
}

/**
 * Calculates hotel accommodation costs per room and per pilgrim for all room categories.
 * Supplier nightly room prices are full-room rates.
 * Single and Double share the same nightly full-room price.
 */
export function calculateHotelStay(
  stay: HotelStayInput,
  rates: ExchangeRates
): HotelCalculationResult {
  const { nights, isOverridden } = calculateStayNights(
    stay.checkInDate,
    stay.checkOutDate,
    stay.manualNightsOverride
  );

  const nightsDec = new Decimal(nights);
  const singleDoubleNightly = new Decimal(stay.singleDoubleNightlyRateSar);
  const tripleNightly = new Decimal(stay.tripleNightlyRateSar);
  const quadNightly = new Decimal(stay.quadNightlyRateSar);

  // Full room total costs = Nightly room price * Number of nights
  const fullRoomSingleDoubleSar = singleDoubleNightly.times(nightsDec);
  const fullRoomTripleSar = tripleNightly.times(nightsDec);
  const fullRoomQuadSar = quadNightly.times(nightsDec);

  // Per-person costs in SAR = Full room cost / Room occupancy
  // Single: fullRoomSingleDouble / 1
  // Double: fullRoomSingleDouble / 2
  // Triple: fullRoomTriple / 3
  // Quad: fullRoomQuad / 4
  const perPersonCostSar: Record<RoomCategoryType, Decimal> = {
    SINGLE: fullRoomSingleDoubleSar.dividedBy(ROOM_OCCUPANCIES.SINGLE),
    DOUBLE: fullRoomSingleDoubleSar.dividedBy(ROOM_OCCUPANCIES.DOUBLE),
    TRIPLE: fullRoomTripleSar.dividedBy(ROOM_OCCUPANCIES.TRIPLE),
    QUAD: fullRoomQuadSar.dividedBy(ROOM_OCCUPANCIES.QUAD),
  };

  // Convert to MAD using trip exchange rates
  const perPersonCostMad: Record<RoomCategoryType, Decimal> = {
    SINGLE: convertToMad(perPersonCostSar.SINGLE, "SAR", rates),
    DOUBLE: convertToMad(perPersonCostSar.DOUBLE, "SAR", rates),
    TRIPLE: convertToMad(perPersonCostSar.TRIPLE, "SAR", rates),
    QUAD: convertToMad(perPersonCostSar.QUAD, "SAR", rates),
  };

  return {
    hotelName: stay.hotelName,
    city: stay.city,
    nightsCount: nights,
    isOverridden,
    fullRoomTotalCostSar: {
      singleDouble: fullRoomSingleDoubleSar,
      triple: fullRoomTripleSar,
      quad: fullRoomQuadSar,
    },
    perPersonCostSar,
    perPersonCostMad,
  };
}

/**
 * Allocates shared transportation costs (group bus or private vehicle).
 */
export function allocateTransportation(
  totalCostSar: Decimal | number | string,
  passengersCount: number
): Decimal {
  if (passengersCount <= 0) {
    throw new Error("Passenger count for transportation allocation must be greater than zero.");
  }
  return new Decimal(totalCostSar).dividedBy(passengersCount);
}

/**
 * Calculates per-person flight cost in MAD.
 */
export function calculateFlightCostPerPilgrim(
  amount: Decimal | number | string,
  currency: CurrencyCode,
  allocation: "PER_PERSON" | "GROUP_TOTAL",
  rates: ExchangeRates,
  groupPilgrimCount?: number
): Decimal {
  const decAmount = new Decimal(amount);
  let perPilgrimForeign: Decimal;

  if (allocation === "GROUP_TOTAL") {
    const count = groupPilgrimCount ?? 1;
    if (count <= 0) {
      throw new Error("Group pilgrim count must be greater than zero for group flight allocation.");
    }
    perPilgrimForeign = decAmount.dividedBy(count);
  } else {
    perPilgrimForeign = decAmount;
  }

  return convertToMad(perPilgrimForeign, currency, rates);
}

/**
 * Calculates a complete Baseline Offer, including:
 * - All hotel stays (Makkah + Madinah)
 * - Group bus transportation allocation
 * - Flights
 * - Visas
 * - Shared services
 * - Complete room-by-room breakdown (Single, Double, Triple, Quad) with fixed MAD profit
 */
export function calculateBaselineOffer(
  input: BaselineOfferCalculationInput
): OfferCalculationResult {
  const { exchangeRates } = input;

  // 1. Calculate each hotel stay
  const calculatedStays = input.hotelStays.map((stay) =>
    calculateHotelStay(stay, exchangeRates)
  );

  // Sum hotel costs in MAD per category
  const totalHotelCostMad: Record<RoomCategoryType, Decimal> = {
    SINGLE: new Decimal(0),
    DOUBLE: new Decimal(0),
    TRIPLE: new Decimal(0),
    QUAD: new Decimal(0),
  };

  for (const stay of calculatedStays) {
    totalHotelCostMad.SINGLE = totalHotelCostMad.SINGLE.plus(stay.perPersonCostMad.SINGLE);
    totalHotelCostMad.DOUBLE = totalHotelCostMad.DOUBLE.plus(stay.perPersonCostMad.DOUBLE);
    totalHotelCostMad.TRIPLE = totalHotelCostMad.TRIPLE.plus(stay.perPersonCostMad.TRIPLE);
    totalHotelCostMad.QUAD = totalHotelCostMad.QUAD.plus(stay.perPersonCostMad.QUAD);
  }

  // 2. Flight cost per pilgrim in MAD
  const flightCostMad = calculateFlightCostPerPilgrim(
    input.flight.amount,
    input.flight.currency,
    input.flight.allocation,
    exchangeRates,
    input.flight.groupPilgrimCount
  );

  // 3. Group bus allocation per pilgrim in SAR & MAD
  const groupBusCostSar = allocateTransportation(
    input.transportation.groupBusTotalSar,
    input.transportation.groupPilgrimCount
  );
  const groupBusCostMad = convertToMad(groupBusCostSar, "SAR", exchangeRates);

  // 4. Visa cost per pilgrim in SAR & MAD
  const visaCostSar = new Decimal(input.visaCostSar);
  const visaCostMad = convertToMad(visaCostSar, "SAR", exchangeRates);

  // 5. Additional shared services per pilgrim in MAD
  let totalServicesMad = new Decimal(0);
  if (input.additionalServices && input.additionalServices.length > 0) {
    for (const service of input.additionalServices) {
      let servicePerPilgrim: Decimal;
      if (service.allocation === "GROUP_TOTAL") {
        const count = service.groupPilgrimCount ?? input.transportation.groupPilgrimCount;
        servicePerPilgrim = new Decimal(service.amount).dividedBy(count);
      } else {
        servicePerPilgrim = new Decimal(service.amount);
      }
      totalServicesMad = totalServicesMad.plus(
        convertToMad(servicePerPilgrim, service.currency, exchangeRates)
      );
    }
  }

  // Fixed profit in MAD (same across room categories for the baseline offer)
  const fixedProfitMad = new Decimal(input.fixedProfitMadPerPilgrim);

  // 6. Build room category breakdowns
  const categories: RoomCategoryType[] = ["SINGLE", "DOUBLE", "TRIPLE", "QUAD"];
  const roomBreakdowns = {} as Record<RoomCategoryType, RoomCostBreakdown>;

  for (const cat of categories) {
    const hotelCost = totalHotelCostMad[cat];
    const totalActualCost = hotelCost
      .plus(flightCostMad)
      .plus(groupBusCostMad)
      .plus(visaCostMad)
      .plus(totalServicesMad);

    const baseSellingPrice = totalActualCost.plus(fixedProfitMad);
    const discount = new Decimal(0);
    const finalSellingPrice = baseSellingPrice.minus(discount);
    const effectiveProfit = finalSellingPrice.minus(totalActualCost);

    roomBreakdowns[cat] = {
      roomCategory: cat,
      occupancy: ROOM_OCCUPANCIES[cat],
      hotelCostMad: roundCurrency(hotelCost),
      flightCostMad: roundCurrency(flightCostMad),
      transportCostMad: roundCurrency(groupBusCostMad),
      visaCostMad: roundCurrency(visaCostMad),
      servicesCostMad: roundCurrency(totalServicesMad),
      totalActualCostMad: roundCurrency(totalActualCost),
      configuredProfitMad: roundCurrency(fixedProfitMad),
      sellingPriceBeforeDiscountMad: roundCurrency(baseSellingPrice),
      discountMad: roundCurrency(discount),
      finalSellingPriceMad: roundCurrency(finalSellingPrice),
      effectiveProfitMad: roundCurrency(effectiveProfit),
      isDeficit: finalSellingPrice.lessThan(totalActualCost),
    };
  }

  return {
    offerName: input.offerName,
    hotelStays: calculatedStays,
    sharedCostsPerPilgrim: {
      flightCostMad: roundCurrency(flightCostMad),
      groupBusCostSar: roundCurrency(groupBusCostSar),
      groupBusCostMad: roundCurrency(groupBusCostMad),
      visaCostSar: roundCurrency(visaCostSar),
      visaCostMad: roundCurrency(visaCostMad),
      servicesCostMad: roundCurrency(totalServicesMad),
    },
    roomBreakdowns,
  };
}

/**
 * Calculates an individual customized quote derived from a baseline room breakdown.
 * Does NOT mutate the baseline offer.
 * Distinguishes:
 * - Real supplier cost deltas (e.g., private transport add-on, service swap)
 * - Profit overrides
 * - Commercial discounts
 */
export function calculateIndividualQuote(
  pilgrimName: string,
  input: IndividualExceptionInput
): IndividualPilgrimQuoteResult {
  const base = input.baselineBreakdown;

  // Real supplier cost deltas
  const privateTransportMad = new Decimal(input.privateTransportAddonsMad ?? 0);
  const serviceDeltasMad = new Decimal(input.serviceCostDeltasMad ?? 0);
  const arbitraryAdjustmentMad = new Decimal(input.arbitraryCostAdjustmentMad ?? 0);

  const totalSupplierDeltaMad = privateTransportMad
    .plus(serviceDeltasMad)
    .plus(arbitraryAdjustmentMad);

  const effectiveCostMad = base.totalActualCostMad.plus(totalSupplierDeltaMad);

  // Profit determination: explicit override or inherited baseline fixed profit
  const effectiveBaseProfitMad =
    input.overrideProfitMad !== undefined && input.overrideProfitMad !== null
      ? new Decimal(input.overrideProfitMad)
      : base.configuredProfitMad;

  // Commercial discount
  const commercialDiscount = new Decimal(input.commercialDiscountMad ?? 0);

  // Final selling price = Effective Cost + Base Profit - Discount
  const sellingPriceBeforeDiscount = effectiveCostMad.plus(effectiveBaseProfitMad);
  const finalSellingPrice = sellingPriceBeforeDiscount.minus(commercialDiscount);

  // Net realized profit = Final Selling Price - Effective Cost
  const netProfit = finalSellingPrice.minus(effectiveCostMad);

  return {
    pilgrimName,
    roomCategory: base.roomCategory,
    supplierCostMad: roundCurrency(base.totalActualCostMad),
    supplierCostDeltaMad: roundCurrency(totalSupplierDeltaMad),
    totalEffectiveCostMad: roundCurrency(effectiveCostMad),
    baseProfitMad: roundCurrency(effectiveBaseProfitMad),
    appliedDiscountMad: roundCurrency(commercialDiscount),
    netProfitMad: roundCurrency(netProfit),
    finalSellingPriceMad: roundCurrency(finalSellingPrice),
    isDeficit: finalSellingPrice.lessThan(effectiveCostMad),
  };
}
