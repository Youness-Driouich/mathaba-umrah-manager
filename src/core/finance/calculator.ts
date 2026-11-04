import Decimal from "decimal.js";
import {
  AdditionalTransportInput,
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
  TrainExpenseInput,
} from "./types";
import { convertToMad, roundCurrency } from "./currency";

/**
 * Standard vehicle passenger capacities as confirmed by official supplier.
 */
export const VEHICLE_CAPACITIES: Record<string, number> = {
  SEDAN: 4,
  GMC: 7,
  STARIA: 7,
  HIACE: 10,
  COASTER: 21,
  BUS: 47,
};

/**
 * Validates that passenger count does not exceed vehicle capacity.
 */
export function validateVehicleCapacity(
  vehicleType: string,
  passengerCount: number,
  vehicleCount: number = 1
): { isValid: boolean; maxCapacity: number; message?: string } {
  const capacityPerVehicle = VEHICLE_CAPACITIES[vehicleType] || 4;
  const maxCapacity = capacityPerVehicle * Math.max(1, vehicleCount);
  const isValid = passengerCount <= maxCapacity && passengerCount > 0;
  return {
    isValid,
    maxCapacity,
    message: isValid
      ? undefined
      : `Passenger count (${passengerCount}) exceeds the maximum vehicle capacity (${maxCapacity} for ${vehicleCount} ${vehicleType}).`,
  };
}

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

  // 4. Additional Transportation included in the baseline offer package
  let additionalTransportCostSar = new Decimal(0);
  let additionalTransportCostMad = new Decimal(0);
  let totalAddTransportsSar = new Decimal(0);
  let includedAddTransportsSar = new Decimal(0);

  if (input.additionalTransports && input.additionalTransports.length > 0) {
    for (const t of input.additionalTransports) {
      const actualPrice = new Decimal(t.actualPriceSar);
      const vehicleCount = t.vehicleCount > 0 ? t.vehicleCount : 1;
      const totalItemCostSar = actualPrice.times(vehicleCount);
      totalAddTransportsSar = totalAddTransportsSar.plus(totalItemCostSar);

      if (t.isIncludedInPackage) {
        includedAddTransportsSar = includedAddTransportsSar.plus(totalItemCostSar);
        const pilgrimCount =
          t.allocatedPilgrimsCount > 0
            ? t.allocatedPilgrimsCount
            : input.transportation.groupPilgrimCount;
        const perPilgrimSar = totalItemCostSar.dividedBy(pilgrimCount);
        const perPilgrimMad = convertToMad(perPilgrimSar, "SAR", exchangeRates);
        additionalTransportCostSar = additionalTransportCostSar.plus(perPilgrimSar);
        additionalTransportCostMad = additionalTransportCostMad.plus(perPilgrimMad);
      }
    }
  }

  // 5. Haramain High-Speed Train included in the baseline offer package
  let trainCostSar = new Decimal(0);
  let trainCostMad = new Decimal(0);
  let totalTrainSar = new Decimal(0);
  let includedTrainSar = new Decimal(0);

  if (input.trainExpenses && input.trainExpenses.length > 0) {
    for (const tr of input.trainExpenses) {
      const ticketPrice = new Decimal(tr.ticketPriceSar);
      const passCount = tr.passengerCount > 0 ? tr.passengerCount : 1;
      const totalItemCostSar = ticketPrice.times(passCount);
      totalTrainSar = totalTrainSar.plus(totalItemCostSar);

      if (tr.isIncluded) {
        includedTrainSar = includedTrainSar.plus(totalItemCostSar);
        // For a train journey included for every pilgrim in the group, per person is the ticket price
        const groupCount =
          input.transportation.groupPilgrimCount > 0
            ? input.transportation.groupPilgrimCount
            : passCount;
        const perPilgrimSar = totalItemCostSar.dividedBy(groupCount);
        const perPilgrimMad = convertToMad(perPilgrimSar, "SAR", exchangeRates);
        trainCostSar = trainCostSar.plus(perPilgrimSar);
        trainCostMad = trainCostMad.plus(perPilgrimMad);
      }
    }
  }

  // 6. Visa cost per pilgrim in SAR & MAD
  const visaCostSar = new Decimal(input.visaCostSar);
  const visaCostMad = convertToMad(visaCostSar, "SAR", exchangeRates);

  // 7. Additional shared services per pilgrim in MAD
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

  // Combined transport per pilgrim (group bus + additional included transport)
  const combinedTransportCostMad = groupBusCostMad.plus(additionalTransportCostMad);

  // Fixed profit in MAD (same across room categories for the baseline offer)
  const fixedProfitMad = new Decimal(input.fixedProfitMadPerPilgrim);

  // 8. Build room category breakdowns
  const categories: RoomCategoryType[] = ["SINGLE", "DOUBLE", "TRIPLE", "QUAD"];
  const roomBreakdowns = {} as Record<RoomCategoryType, RoomCostBreakdown>;

  for (const cat of categories) {
    const hotelCost = totalHotelCostMad[cat];
    const totalActualCost = hotelCost
      .plus(flightCostMad)
      .plus(groupBusCostMad)
      .plus(additionalTransportCostMad)
      .plus(trainCostMad)
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
      transportCostMad: roundCurrency(combinedTransportCostMad),
      groupBusCostMad: roundCurrency(groupBusCostMad),
      additionalTransportCostMad: roundCurrency(additionalTransportCostMad),
      trainCostMad: roundCurrency(trainCostMad),
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
      additionalTransportCostSar: roundCurrency(additionalTransportCostSar),
      additionalTransportCostMad: roundCurrency(additionalTransportCostMad),
      trainCostSar: roundCurrency(trainCostSar),
      trainCostMad: roundCurrency(trainCostMad),
      visaCostSar: roundCurrency(visaCostSar),
      visaCostMad: roundCurrency(visaCostMad),
      servicesCostMad: roundCurrency(totalServicesMad),
    },
    additionalTransportsSummary: {
      totalCostSar: roundCurrency(totalAddTransportsSar),
      totalCostMad: roundCurrency(convertToMad(totalAddTransportsSar, "SAR", exchangeRates)),
      includedInPackageCostSar: roundCurrency(includedAddTransportsSar),
      includedInPackageCostMad: roundCurrency(convertToMad(includedAddTransportsSar, "SAR", exchangeRates)),
    },
    trainExpensesSummary: {
      totalCostSar: roundCurrency(totalTrainSar),
      totalCostMad: roundCurrency(convertToMad(totalTrainSar, "SAR", exchangeRates)),
      includedInPackageCostSar: roundCurrency(includedTrainSar),
      includedInPackageCostMad: roundCurrency(convertToMad(includedTrainSar, "SAR", exchangeRates)),
    },
    roomBreakdowns,
  };
}

/**
 * Calculates an individual customized quote derived from a baseline room breakdown.
 * Does NOT mutate the baseline offer.
 * Strictly implements Phase 5 Centralized Financial Engine:
 * - New Actual Cost = Base Cost + Supplier Cost Additions - Real Supplier Cost Reductions
 * - Selling Price = New Actual Cost + Configured Profit - Commercial Discount
 * - Realized Profit = Selling Price - New Actual Cost
 * - Negative margin deficit warning if Selling Price < New Actual Cost
 */
export function calculateIndividualQuote(
  pilgrimName: string,
  input: IndividualExceptionInput
): IndividualPilgrimQuoteResult {
  const base = input.baselineBreakdown;

  let additions = new Decimal(0);
  let reductions = new Decimal(0);
  let extraCommercialDiscounts = new Decimal(0);

  // Add individual legacy / flat inputs if present
  if (input.privateTransportAddonsMad) {
    const pt = new Decimal(input.privateTransportAddonsMad);
    if (pt.isPositive()) additions = additions.plus(pt);
    else reductions = reductions.plus(pt.abs());
  }

  if (input.serviceCostDeltasMad) {
    const sd = new Decimal(input.serviceCostDeltasMad);
    if (sd.isPositive()) additions = additions.plus(sd);
    else reductions = reductions.plus(sd.abs());
  }

  if (input.arbitraryCostAdjustmentMad) {
    const adj = new Decimal(input.arbitraryCostAdjustmentMad);
    if (adj.isPositive()) additions = additions.plus(adj);
    else reductions = reductions.plus(adj.abs());
  }

  const processedCustomizations: Array<{
    type: string;
    description: string;
    supplierCostDeltaMad: Decimal;
    sellingPriceDeltaMad: Decimal;
    details?: any;
  }> = [];

  // Process structured customization items (7 Exception Types)
  // Supports both customizationItems and customizations property names for resilience
  const items = input.customizationItems || input.customizations || [];
  if (items && items.length > 0) {
    for (const item of items) {
      const delta = new Decimal(item.supplierCostDeltaMad || 0);
      const sellingDelta = new Decimal(item.sellingPriceDeltaMad || 0);

      if (delta.isPositive()) {
        additions = additions.plus(delta);
      } else if (delta.isNegative()) {
        reductions = reductions.plus(delta.abs());
      }

      if (item.details?.commercialDiscountMad) {
        extraCommercialDiscounts = extraCommercialDiscounts.plus(
          new Decimal(item.details.commercialDiscountMad)
        );
      }

      processedCustomizations.push({
        type: item.type,
        description: item.description,
        supplierCostDeltaMad: roundCurrency(delta),
        sellingPriceDeltaMad: roundCurrency(sellingDelta),
        details: item.details,
      });
    }
  }

  const netSupplierDeltaMad = additions.minus(reductions);
  const effectiveCostMad = base.totalActualCostMad.plus(netSupplierDeltaMad);

  // Profit determination: explicit override or inherited baseline fixed profit
  const isProfitOverridden =
    input.overrideProfitMad !== undefined && input.overrideProfitMad !== null;
  const effectiveBaseProfitMad = isProfitOverridden
    ? new Decimal(input.overrideProfitMad!)
    : base.configuredProfitMad;

  // Commercial discount (quote-level + item-level)
  const totalCommercialDiscount = new Decimal(input.commercialDiscountMad ?? 0).plus(
    extraCommercialDiscounts
  );

  // Final selling price = Effective Cost + Configured Profit - Discount
  const sellingPriceBeforeDiscount = effectiveCostMad.plus(effectiveBaseProfitMad);
  const finalSellingPrice = sellingPriceBeforeDiscount.minus(totalCommercialDiscount);

  // Net realized profit = Final Selling Price - Effective Cost
  const netProfit = finalSellingPrice.minus(effectiveCostMad);

  return {
    pilgrimName,
    roomCategory: base.roomCategory,
    supplierCostMad: roundCurrency(base.totalActualCostMad),
    supplierCostDeltaMad: roundCurrency(netSupplierDeltaMad),
    supplierCostAdditionsMad: roundCurrency(additions),
    supplierCostReductionsMad: roundCurrency(reductions),
    totalEffectiveCostMad: roundCurrency(effectiveCostMad),
    baseProfitMad: roundCurrency(effectiveBaseProfitMad),
    isProfitOverridden,
    appliedDiscountMad: roundCurrency(totalCommercialDiscount),
    netProfitMad: roundCurrency(netProfit),
    finalSellingPriceMad: roundCurrency(finalSellingPrice),
    isDeficit: finalSellingPrice.lessThan(effectiveCostMad),
    customizations: processedCustomizations,
  };
}
