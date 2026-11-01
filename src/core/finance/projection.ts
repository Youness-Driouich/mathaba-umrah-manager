import {
  CustomerFacingQuotation,
  IndividualPilgrimQuoteResult,
  OfferCalculationResult,
  RoomCategoryType,
} from "./types";

export interface ProjectCustomerQuotationParams {
  agencyName: string;
  tripName: string;
  offerResult: OfferCalculationResult;
  selectedRoomCategory: RoomCategoryType;
  pilgrimQuote?: IndividualPilgrimQuoteResult;
  pilgrimName?: string;
  includedServices: string[];
  flightIncluded: boolean;
  transportIncluded: string;
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
    agencyName,
    tripName,
    offerResult,
    selectedRoomCategory,
    pilgrimQuote,
    pilgrimName,
    includedServices,
    flightIncluded,
    transportIncluded,
    termsAndConditions,
  } = params;

  // Final selling price either from customized individual quote or baseline offer
  const sellingPrice = pilgrimQuote
    ? pilgrimQuote.finalSellingPriceMad.toNumber()
    : offerResult.roomBreakdowns[selectedRoomCategory].finalSellingPriceMad.toNumber();

  const quotation: CustomerFacingQuotation = {
    agencyName,
    tripName,
    offerName: offerResult.offerName,
    pilgrimName: pilgrimName || pilgrimQuote?.pilgrimName,
    roomCategory: selectedRoomCategory,
    hotelStays: offerResult.hotelStays.map((stay) => ({
      city: stay.city,
      hotelName: stay.hotelName,
      checkInDate: "", // filled from input dates
      checkOutDate: "",
      nights: stay.nightsCount,
    })),
    includedServices: [...includedServices],
    flightIncluded,
    transportIncluded,
    finalSellingPriceMad: sellingPrice,
    currency: "MAD",
    termsAndConditions: termsAndConditions ?? [
      "Passport must be valid for at least 6 months from travel date.",
      "Package price includes taxes and visa fees.",
      "Check-in and check-out times are subject to Saudi hotel standard policies.",
    ],
  };

  return quotation;
}

/**
 * Audit helper to verify that a generated customer object contains NO leaked financial secrets.
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
    "discount",
    "deficit",
  ];

  const leakedFields: string[] = [];

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
