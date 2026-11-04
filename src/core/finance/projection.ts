import {
  CustomerFacingQuotation,
  InternalFinancialReportData,
  IndividualPilgrimQuoteResult,
  OfferCalculationResult,
  RoomCategoryType,
  RoomCostBreakdown,
} from "./types";

export interface ProjectCustomerQuotationParams {
  referenceNumber?: string;
  issueDate?: string;
  agencyName: string;
  agencyPhone?: string | null;
  agencyEmail?: string | null;
  agencyAddress?: string | null;
  documentFooterText?: string | null;
  tripName: string;
  tripStartDate?: string;
  tripEndDate?: string;
  offerResult: OfferCalculationResult;
  selectedRoomCategory?: RoomCategoryType;
  pilgrimQuote?: IndividualPilgrimQuoteResult;
  pilgrimName?: string;
  contactPhone?: string | null;
  isIndividualQuote?: boolean;
  isDraft?: boolean;
  flightDetails?: {
    airlineName?: string;
    flightIncluded: boolean;
    description: string;
  };
  transportServices?: Array<{
    routeName: string;
    vehicleType?: string;
    isPrivate?: boolean;
    description: string;
  }>;
  trainJourneys?: Array<{
    departureStation: string;
    arrivalStation: string;
    ticketClass: "ECONOMY" | "BUSINESS";
    travelDate?: string;
  }>;
  includedServices?: string[];
  customizationDescriptions?: string[];
  termsAndConditions?: string[];
}

/**
 * Projects a clean, customer-facing quotation document.
 * GUARANTEE: Never exposes internal supplier costs, profit margins,
 * discounts, or exchange rate calculations to the customer.
 */
export function projectCustomerFacingQuotation(
  params: ProjectCustomerQuotationParams
): CustomerFacingQuotation {
  const {
    referenceNumber,
    issueDate,
    agencyName,
    agencyPhone,
    agencyEmail,
    agencyAddress,
    documentFooterText,
    tripName,
    tripStartDate,
    tripEndDate,
    offerResult,
    selectedRoomCategory = "DOUBLE",
    pilgrimQuote,
    pilgrimName,
    contactPhone,
    isIndividualQuote = false,
    isDraft = false,
    flightDetails,
    transportServices,
    trainJourneys,
    includedServices,
    customizationDescriptions,
    termsAndConditions,
  } = params;

  // Final selling price either from customized individual quote or baseline offer
  const sellingPrice = pilgrimQuote
    ? pilgrimQuote.finalSellingPriceMad.toNumber()
    : offerResult.roomBreakdowns[selectedRoomCategory].finalSellingPriceMad.toNumber();

  const roomMatrixPrices: Record<RoomCategoryType, number> = {
    SINGLE: offerResult.roomBreakdowns.SINGLE.finalSellingPriceMad.toNumber(),
    DOUBLE: offerResult.roomBreakdowns.DOUBLE.finalSellingPriceMad.toNumber(),
    TRIPLE: offerResult.roomBreakdowns.TRIPLE.finalSellingPriceMad.toNumber(),
    QUAD: offerResult.roomBreakdowns.QUAD.finalSellingPriceMad.toNumber(),
  };

  const defaultTerms = [
    "صلاحية جواز السفر لا تقل عن 6 أشهر من تاريخ السفر المعتمد.",
    "الأسعار تشمل رسوم التأشيرة والضرائب المعمول بها في المملكة العربية السعودية والمغرب.",
    "مواعيد الدخول والخروج تخضع لسياسات الفنادق المعتمدة بالمملكة.",
    "العرض ساري لمدة 7 أيام من تاريخ إصداره ما لم يُؤكد الحجز رسمياً.",
  ];

  const quotation: CustomerFacingQuotation = {
    referenceNumber: referenceNumber || `MTH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    issueDate: issueDate || new Date().toISOString().split("T")[0],
    agencyName: agencyName || "Mathaba Umrah Services",
    agencyPhone: agencyPhone || null,
    agencyEmail: agencyEmail || null,
    agencyAddress: agencyAddress || null,
    documentFooterText: documentFooterText || null,
    tripName,
    tripStartDate,
    tripEndDate,
    offerName: offerResult.offerName,
    pilgrimName: pilgrimName || pilgrimQuote?.pilgrimName,
    contactPhone: contactPhone || null,
    isIndividualQuote,
    isDraft,
    roomCategory: selectedRoomCategory,
    roomMatrixPrices,
    hotelStays: offerResult.hotelStays.map((stay) => ({
      city: stay.city,
      hotelName: stay.hotelName,
      checkInDate: "",
      checkOutDate: "",
      nights: stay.nightsCount,
    })),
    flightDetails,
    transportServices: transportServices || [
      {
        routeName: "حافلات حديثة ومكيفة لكامل مسار الرحلة",
        isPrivate: false,
        description: "تنقلات جماعية مريحة ومكيفة تشمل المزارات الدينية",
      },
    ],
    trainJourneys,
    includedServices: includedServices ? [...includedServices] : [
      "تأشيرة العمرة الإلكترونية والتأمين الطبي الشامل",
      "الإقامة الفندقية المختارة بمكة المكرمة والمدينة المنورة",
      "المزارات الدينية المعتمدة بإشراف مرشدين مؤهلين",
      "حقيبة هدايا المعتمر ومياه زمزم المباركة",
    ],
    customizationDescriptions,
    finalSellingPriceMad: sellingPrice,
    currency: "MAD",
    termsAndConditions: termsAndConditions?.length ? termsAndConditions : defaultTerms,
  };

  return quotation;
}

export interface BuildInternalReportParams {
  reportReference?: string;
  generationDate?: string;
  isDraft?: boolean;
  agencyName: string;
  tripName: string;
  tripDates: {
    start: string;
    end: string;
    nightsCount?: number;
  };
  expectedPilgrims: number;
  exchangeRates: {
    sarToMad: number;
    eurToMad: number;
  };
  offerName: string;
  pilgrimName?: string;
  isIndividualQuote?: boolean;
  roomCategory: RoomCategoryType;
  hotelStaysBreakdown: Array<{
    hotelName: string;
    city: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    isOverridden: boolean;
    singleDoubleRateSar: number;
    tripleRateSar: number;
    quadRateSar: number;
    fullRoomTotalSar: number;
    perPersonSar: number;
    perPersonMad: number;
  }>;
  flightExpense: {
    amount: number;
    currency: string;
    allocationType: string;
    perPilgrimMad: number;
  };
  visaExpense: {
    perPilgrimSar: number;
    perPilgrimMad: number;
    isHistoricalSnapshot: boolean;
  };
  groupBusExpense: {
    totalCostSar: number;
    pilgrimCount: number;
    perPilgrimSar: number;
    perPilgrimMad: number;
    isMaintained: boolean;
  };
  additionalTransports?: Array<{
    routeName: string;
    vehicleType: string;
    vehicleCount: number;
    capacity: number;
    allocatedPilgrims: number;
    priceSar: number;
    perPilgrimSar: number;
    perPilgrimMad: number;
    isIncluded: boolean;
  }>;
  trainExpenses?: Array<{
    departureStation: string;
    arrivalStation: string;
    ticketClass: string;
    ticketPriceSar: number;
    passengerCount: number;
    perPilgrimMad: number;
    isIncluded: boolean;
  }>;
  additionalServices?: Array<{
    serviceName: string;
    amount: number;
    currency: string;
    perPilgrimMad: number;
  }>;
  individualCustomizations?: Array<{
    type: string;
    description: string;
    supplierCostDeltaMad: number;
    isRecoverable?: boolean;
    details?: any;
  }>;
  roomPricingSummary: {
    baseActualCostMad: number;
    supplierCostAdditionsMad: number;
    supplierCostReductionsMad: number;
    netSupplierCostDeltaMad: number;
    newActualCostMad: number;
    configuredProfitMad: number;
    isProfitOverridden: boolean;
    commercialDiscountMad: number;
    finalSellingPriceMad: number;
    realizedProfitMad: number;
  };
  multiRoomBreakdowns?: Record<RoomCategoryType, RoomCostBreakdown>;
}

/**
 * Builds the confidential internal financial audit report data model.
 */
export function buildInternalFinancialReportData(
  params: BuildInternalReportParams
): InternalFinancialReportData {
  const isDeficit = params.roomPricingSummary.realizedProfitMad < 0;
  const deficitAmountMad = isDeficit
    ? Math.abs(params.roomPricingSummary.realizedProfitMad)
    : 0;

  return {
    isConfidential: true,
    reportReference: params.reportReference || `MTH-AUDIT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    generationDate: params.generationDate || new Date().toISOString().split("T")[0],
    isDraft: params.isDraft ?? false,
    isDeficit,
    deficitAmountMad,
    agencyName: params.agencyName,
    tripName: params.tripName,
    tripDates: params.tripDates,
    expectedPilgrims: params.expectedPilgrims,
    exchangeRates: params.exchangeRates,
    offerName: params.offerName,
    pilgrimName: params.pilgrimName,
    isIndividualQuote: params.isIndividualQuote ?? false,
    roomCategory: params.roomCategory,
    hotelStaysBreakdown: params.hotelStaysBreakdown,
    flightExpense: params.flightExpense,
    visaExpense: params.visaExpense,
    groupBusExpense: params.groupBusExpense,
    additionalTransports: params.additionalTransports || [],
    trainExpenses: params.trainExpenses || [],
    additionalServices: params.additionalServices || [],
    individualCustomizations: params.individualCustomizations,
    roomPricingSummary: params.roomPricingSummary,
    multiRoomBreakdowns: params.multiRoomBreakdowns,
  };
}

export const CUSTOMER_QUOTATION_ALLOWLIST_KEYS = new Set<string>([
  "referenceNumber",
  "issueDate",
  "agencyName",
  "agencyPhone",
  "agencyEmail",
  "agencyAddress",
  "documentFooterText",
  "tripName",
  "tripStartDate",
  "tripEndDate",
  "offerName",
  "pilgrimName",
  "contactPhone",
  "isIndividualQuote",
  "isDraft",
  "roomCategory",
  "roomMatrixPrices",
  "hotelStays",
  "flightDetails",
  "transportServices",
  "trainJourneys",
  "includedServices",
  "customizationDescriptions",
  "finalSellingPriceMad",
  "currency",
  "termsAndConditions",
]);

/**
 * Audit helper to verify that a generated customer object contains NO leaked financial secrets.
 * Combines a strict allowlist of authorized public fields with deep forbidden-keyword scanning.
 */
export function verifyQuotationPrivacy(obj: Record<string, unknown>): {
  isSafe: boolean;
  leakedFields: string[];
} {
  const forbiddenKeywords = [
    "profit",
    "margin",
    "supplier",
    "cost",
    "rate",
    "exchange",
    "deficit",
  ];

  const leakedFields: string[] = [];

  // 1. Strict Allowlist verification at root level
  for (const rootKey of Object.keys(obj)) {
    if (!CUSTOMER_QUOTATION_ALLOWLIST_KEYS.has(rootKey)) {
      leakedFields.push(`[UNAUTHORIZED_FIELD]: ${rootKey}`);
    }
  }

  // 2. Deep keyword scanning
  function inspect(target: unknown, prefix = "") {
    if (!target || typeof target !== "object") return;

    for (const [key, value] of Object.entries(target as Record<string, unknown>)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const lowerKey = key.toLowerCase();

      for (const kw of forbiddenKeywords) {
        if (lowerKey.includes(kw)) {
          leakedFields.push(fullKey);
        }
      }

      if (value && typeof value === "object" && !Array.isArray(value)) {
        inspect(value, fullKey);
      }
    }
  }

  inspect(obj);

  return {
    isSafe: leakedFields.length === 0,
    leakedFields,
  };
}
