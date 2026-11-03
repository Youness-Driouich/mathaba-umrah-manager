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

export interface AdditionalTransportInput {
  id?: string;
  routeName: string;
  vehicleType: "SEDAN" | "GMC" | "STARIA" | "HIACE" | "COASTER" | "BUS";
  vehicleCount: number;
  capacityPerVehicle: number;
  allocatedPilgrimsCount: number;
  supplierReferencePrice: Decimal | number | string;
  actualPriceSar: Decimal | number | string;
  isPriceOverridden?: boolean;
  isIncludedInPackage: boolean;
  notes?: string | null;
}

export interface TrainExpenseInput {
  id?: string;
  departureStation: string;
  arrivalStation: string;
  travelDate?: Date | string | null;
  ticketClass: "ECONOMY" | "BUSINESS";
  ticketPriceSar: Decimal | number | string;
  passengerCount: number;
  isIncluded: boolean;
  notes?: string | null;
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
  additionalTransports?: AdditionalTransportInput[];
  trainExpenses?: TrainExpenseInput[];
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
  groupBusCostMad: Decimal;
  additionalTransportCostMad: Decimal;
  trainCostMad: Decimal;
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
    additionalTransportCostSar: Decimal;
    additionalTransportCostMad: Decimal;
    trainCostSar: Decimal;
    trainCostMad: Decimal;
    visaCostSar: Decimal;
    visaCostMad: Decimal;
    servicesCostMad: Decimal;
  };
  additionalTransportsSummary?: {
    totalCostSar: Decimal;
    totalCostMad: Decimal;
    includedInPackageCostSar: Decimal;
    includedInPackageCostMad: Decimal;
  };
  trainExpensesSummary?: {
    totalCostSar: Decimal;
    totalCostMad: Decimal;
    includedInPackageCostSar: Decimal;
    includedInPackageCostMad: Decimal;
  };
  roomBreakdowns: Record<RoomCategoryType, RoomCostBreakdown>;
}

export interface QuoteCustomizationDetail {
  routeId?: string;
  routeName?: string;
  vehicleType?: "SEDAN" | "GMC" | "STARIA" | "HIACE" | "COASTER" | "BUS";
  vehicleCostSar?: number;
  vehicleCostMad?: number;
  passengersSharing?: number;
  perPersonCostSar?: number;
  perPersonCostMad?: number;
  originalServiceName?: string;
  replacementServiceName?: string;
  isRecoverable?: boolean;
  supplierCostAdditionMad?: number;
  supplierCostReductionMad?: number;
  commercialDiscountMad?: number;
  notes?: string;
}

export interface QuoteCustomizationItemInput {
  id?: string;
  type: "ADD_PRIVATE_TRANSPORT" | "REMOVE_SERVICE" | "REPLACE_SERVICE" | "ADD_SERVICE" | "CUSTOM_EXPENSE" | "ADDON";
  description: string;
  supplierCostDeltaMad: Decimal | number | string;
  sellingPriceDeltaMad?: Decimal | number | string;
  details?: QuoteCustomizationDetail | null;
}

export interface IndividualExceptionInput {
  baselineBreakdown: RoomCostBreakdown;
  overrideProfitMad?: Decimal | number | string | null;
  commercialDiscountMad?: Decimal | number | string;
  arbitraryCostAdjustmentMad?: Decimal | number | string;
  arbitraryAdjustmentReason?: string;
  privateTransportAddonsMad?: Decimal | number | string;
  serviceCostDeltasMad?: Decimal | number | string;
  customizationItems?: QuoteCustomizationItemInput[];
}

export interface IndividualPilgrimQuoteResult {
  pilgrimName: string;
  roomCategory: RoomCategoryType;
  supplierCostMad: Decimal;
  supplierCostDeltaMad: Decimal;
  supplierCostAdditionsMad: Decimal;
  supplierCostReductionsMad: Decimal;
  totalEffectiveCostMad: Decimal;
  baseProfitMad: Decimal;
  isProfitOverridden: boolean;
  appliedDiscountMad: Decimal;
  netProfitMad: Decimal;
  finalSellingPriceMad: Decimal;
  isDeficit: boolean;
  customizations?: Array<{
    type: string;
    description: string;
    supplierCostDeltaMad: Decimal;
    sellingPriceDeltaMad: Decimal;
    details?: QuoteCustomizationDetail | null;
  }>;
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
