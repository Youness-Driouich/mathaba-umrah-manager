import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateBaselineOffer } from "@/core/finance/calculator";
import { HotelStayInput } from "@/core/finance/types";

export const dynamic = "force-dynamic";

// GET: All offers across all trips with room price breakdown summary
export async function GET(_req: NextRequest) {
  try {
    const offers = await prisma.offer.findMany({
      include: {
        trip: {
          select: {
            id: true,
            name: true,
            slug: true,
            startDate: true,
            endDate: true,
            expectedPilgrims: true,
            flightCost: true,
            flightCurrency: true,
            flightAllocationType: true,
            sarToMadRate: true,
            eurToMadRate: true,
            groupBusCostSar: true,
            visaCostSar: true,
            status: true,
          },
        },
        hotelStays: {
          orderBy: { checkInDate: "asc" },
        },
        additionalTransports: {
          orderBy: { createdAt: "asc" },
        },
        trainExpenses: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { individualQuotes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const calculatedOffers = offers.map((offer) => {
      const { trip } = offer;
      const visaCostSar = Number(trip.visaCostSar ?? 525);

      const hotelInputs: HotelStayInput[] = offer.hotelStays.map((stay) => ({
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

      const additionalTransportsInputs = offer.additionalTransports.map((t) => ({
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

      const trainExpenseInputs = offer.trainExpenses.map((tr) => ({
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

      const calc = calculateBaselineOffer({
        offerName: offer.name,
        exchangeRates: {
          sarToMad: Number(trip.sarToMadRate),
          eurToMad: Number(trip.eurToMadRate),
        },
        hotelStays: hotelInputs,
        flight: {
          amount: Number(trip.flightCost),
          currency: trip.flightCurrency,
          allocation: trip.flightAllocationType,
          groupPilgrimCount: trip.expectedPilgrims,
        },
        transportation: {
          groupBusTotalSar: Number(trip.groupBusCostSar),
          groupPilgrimCount: trip.expectedPilgrims,
        },
        additionalTransports: additionalTransportsInputs,
        trainExpenses: trainExpenseInputs,
        visaCostSar,
        fixedProfitMadPerPilgrim: Number(offer.fixedProfitMad),
      });

      return {
        id: offer.id,
        name: offer.name,
        fixedProfitMad: Number(offer.fixedProfitMad),
        isActive: offer.isActive,
        notes: offer.notes,
        createdAt: offer.createdAt,
        hotelStaysCount: offer.hotelStays.length,
        quotesCount: offer._count.individualQuotes,
        trip: {
          ...trip,
          flightCost: Number(trip.flightCost),
          sarToMadRate: Number(trip.sarToMadRate),
          eurToMadRate: Number(trip.eurToMadRate),
          groupBusCostSar: Number(trip.groupBusCostSar),
        },
        pricingSummary: {
          singleMad: calc.roomBreakdowns.SINGLE.finalSellingPriceMad,
          doubleMad: calc.roomBreakdowns.DOUBLE.finalSellingPriceMad,
          tripleMad: calc.roomBreakdowns.TRIPLE.finalSellingPriceMad,
          quadMad: calc.roomBreakdowns.QUAD.finalSellingPriceMad,
          hasDeficit:
            calc.roomBreakdowns.SINGLE.isDeficit ||
            calc.roomBreakdowns.DOUBLE.isDeficit ||
            calc.roomBreakdowns.TRIPLE.isDeficit ||
            calc.roomBreakdowns.QUAD.isDeficit,
        },
      };
    });

    return NextResponse.json({
      success: true,
      offers: calculatedOffers,
    });
  } catch (error) {
    console.error("Error retrieving offers list:", error);
    return NextResponse.json({ error: "Failed to retrieve offers" }, { status: 500 });
  }
}
