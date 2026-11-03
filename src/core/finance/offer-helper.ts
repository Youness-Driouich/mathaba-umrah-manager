import { Offer, UmrahTrip, OfferHotelStay, OfferAdditionalTransport, OfferTrainExpense } from "@prisma/client";
import { calculateBaselineOffer } from "./calculator";
import { HotelStayInput, AdditionalTransportInput, TrainExpenseInput, OfferCalculationResult } from "./types";

export type OfferWithRelations = Offer & {
  trip: UmrahTrip;
  hotelStays: OfferHotelStay[];
  additionalTransports?: OfferAdditionalTransport[];
  trainExpenses?: OfferTrainExpense[];
};

export function computeOfferCalculation(offer: OfferWithRelations): OfferCalculationResult {
  const { trip } = offer;
  const visaCostSar = Number(trip.visaCostSar ?? 525);

  const hotelInputs: HotelStayInput[] = (offer.hotelStays || []).map((stay) => ({
    id: stay.id,
    hotelName: stay.hotelName,
    city: stay.city as "MAKKAH" | "MADINAH",
    checkInDate: stay.checkInDate,
    checkOutDate: stay.checkOutDate,
    manualNightsOverride: stay.isNightsOverridden ? stay.nightsCount : null,
    singleDoubleNightlyRateSar: Number(stay.singleDoubleRateSar),
    tripleNightlyRateSar: Number(stay.tripleRateSar),
    quadNightlyRateSar: Number(stay.quadRateSar),
  }));

  const addTransportsInput: AdditionalTransportInput[] = (offer.additionalTransports || []).map((t) => ({
    id: t.id,
    routeName: t.routeName,
    vehicleType: t.vehicleType,
    vehicleCount: t.vehicleCount,
    capacityPerVehicle: t.capacityPerVehicle,
    allocatedPilgrimsCount: t.allocatedPilgrimsCount,
    supplierReferencePrice: Number(t.supplierReferencePrice),
    actualPriceSar: Number(t.actualPriceSar),
    isPriceOverridden: t.isPriceOverridden,
    isIncludedInPackage: t.isIncludedInPackage,
    notes: t.notes,
  }));

  const trainExpensesInput: TrainExpenseInput[] = (offer.trainExpenses || []).map((tr) => ({
    id: tr.id,
    departureStation: tr.departureStation,
    arrivalStation: tr.arrivalStation,
    travelDate: tr.travelDate,
    ticketClass: tr.ticketClass,
    ticketPriceSar: Number(tr.ticketPriceSar),
    passengerCount: tr.passengerCount,
    isIncluded: tr.isIncluded,
    notes: tr.notes,
  }));

  return calculateBaselineOffer({
    offerName: offer.name,
    exchangeRates: {
      sarToMad: Number(trip.sarToMadRate),
      eurToMad: Number(trip.eurToMadRate),
    },
    hotelStays: hotelInputs,
    flight: {
      amount: Number(trip.flightCost),
      currency: trip.flightCurrency as "MAD" | "SAR" | "EUR",
      allocation: trip.flightAllocationType as "PER_PERSON" | "GROUP_TOTAL",
      groupPilgrimCount: trip.expectedPilgrims,
    },
    transportation: {
      groupBusTotalSar: Number(trip.groupBusCostSar),
      groupPilgrimCount: trip.expectedPilgrims,
    },
    additionalTransports: addTransportsInput,
    trainExpenses: trainExpensesInput,
    visaCostSar,
    fixedProfitMadPerPilgrim: Number(offer.fixedProfitMad),
  });
}
