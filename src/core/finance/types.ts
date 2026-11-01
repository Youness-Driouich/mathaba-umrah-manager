import Decimal from "decimal.js";

export type CurrencyCode = "MAD" | "SAR" | "EUR";

export type RoomCategoryType = "SINGLE" | "DOUBLE" | "TRIPLE" | "QUAD";

export const ROOM_OCCUPANCIES: Record<RoomCategoryType, number> = {
  SINGLE: 1,
  DOUBLE: 2,
  TRIPLE: 3,
  QUAD: 4,
};

export interface ExchangeRates {
  sarToMad: Decimal | number | string;
  eurToMad: Decimal | number | string;
}

export interface HotelStayInput {
  id?: string;
  hotelName: string;
  city: "MAKKAH" | "MADINAH";
  checkInDate: string | Date;
  checkOutDate: string | Date;
  manualNightsOverride?: number | null;
  /** Full room nightly rate in SAR for Single & Double */
  singleDoubleNightlyRateSar: Decimal | number | string;
  /** Full room nightly rate in SAR for Triple */
  tripleNightlyRateSar: Decimal | number | string;
  /** Full room nightly rate in SAR for Quadruple */
  quadNightlyRateSar: Decimal | number | string;
}

export interface HotelCalculationResult {
  hotelName: string;
  city: "MAKKAH" | "MADINAH";
  nightsCount: number;
  isOverridden: boolean;
  fullRoomTotalCostSar: {
    singleDouble: Decimal;
    triple: Decimal;
    quad: Decimal;
  };
  perPersonCostSar: Record<RoomCategoryType, Decimal>;
  perPersonCostMad: Record<RoomCategoryType, Decimal>;
}

export interface ServiceCostInput {
  name: string;
  amount: Decimal | number | string;
  currency: CurrencyCode;
  allocation: "PER_PERSON" | "GROUP_TOTAL";
  groupPilgrimCount?: number;
}

export interface FlightCostInput {
  amount: Decimal | number | string;
  currency: CurrencyCode;
  allocation: "PER_PERSON" | "GROUP_TOTAL";
  groupPilgrimCount?: number;
}

export interface TransportationCostInput {
  groupBusTotalSar: Decimal | number | string;
  groupPilgrimCount: number;
  additionalPrivateTransfers?: Array<{
    description: string;
    costSar: Decimal | number | string;
    sharedByPilgrimsCount: number;
  }>;
}

export interface BaselineOfferCalculationInput {
  offerName: string;
  exchangeRates: ExchangeRates;
  hotelStays: HotelStayInput[];
  flight: FlightCostInput;
  transportation: TransportationCostInput;
  visaCostSar: Decimal | number | string;
  additionalServices?: ServiceCostInput[];
  fixedProfitMadPerPilgrim: Decimal | number | string;
}

export interface RoomCostBreakdown {
  roomCategory: RoomCategoryType;
  occupancy: number;
  hotelCostMad: Decimal;
  flightCostMad: Decimal;
  transportCostMad: Decimal;
  visaCostMad: Decimal;
  servicesCostMad: Decimal;
  totalActualCostMad: Decimal;
  configuredProfitMad: Decimal;
  sellingPriceBeforeDiscountMad: Decimal;
  discountMad: Decimal;
  finalSellingPriceMad: Decimal;
  effectiveProfitMad: Decimal;
  isDeficit: boolean; // true if final selling price < actual cost
}

export interface OfferCalculationResult {
  offerName: string;
  hotelStays: HotelCalculationResult[];
  sharedCostsPerPilgrim: {
    flightCostMad: Decimal;
    groupBusCostSar: Decimal;
    groupBusCostMad: Decimal;
    visaCostSar: Decimal;
    visaCostMad: Decimal;
    servicesCostMad: Decimal;
  };
  roomBreakdowns: Record<RoomCategoryType, RoomCostBreakdown>;
}

export interface IndividualExceptionInput {
  baselineBreakdown: RoomCostBreakdown;
  overrideProfitMad?: Decimal | number | string | null;
  commercialDiscountMad?: Decimal | number | string;
  arbitraryCostAdjustmentMad?: Decimal | number | string;
  arbitraryAdjustmentReason?: string;
  privateTransportAddonsMad?: Decimal | number | string;
  serviceCostDeltasMad?: Decimal | number | string;
}

export interface IndividualPilgrimQuoteResult {
  pilgrimName: string;
  roomCategory: RoomCategoryType;
  supplierCostMad: Decimal;
  supplierCostDeltaMad: Decimal;
  totalEffectiveCostMad: Decimal;
  baseProfitMad: Decimal;
  appliedDiscountMad: Decimal;
  netProfitMad: Decimal;
  finalSellingPriceMad: Decimal;
  isDeficit: boolean;
}

/**
 * Clean data contract for Customer-Facing Quotation
 * Strictly hides internal supplier costs, margins, and breakdown deltas.
 */
export interface CustomerFacingQuotation {
  agencyName: string;
  tripName: string;
  offerName: string;
  pilgrimName?: string;
  roomCategory: RoomCategoryType;
  hotelStays: Array<{
    city: "MAKKAH" | "MADINAH";
    hotelName: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
  }>;
  includedServices: string[];
  flightIncluded: boolean;
  transportIncluded: string;
  finalSellingPriceMad: number; // formatted as retail number
  currency: "MAD";
  termsAndConditions?: string[];
}
