import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateBaselineOffer } from "@/core/finance/calculator";
import { HotelStayInput } from "@/core/finance/types";

export const dynamic = "force-dynamic";

// GET: All offers across all trips with room price breakdown summary
export async function GET(_req: NextRequest) {
  try {
    const globalSettings = await prisma.globalSetting.findUnique({
      where: { id: "default" },
    });
    const visaCostSar = Number(globalSettings?.defaultVisaCostSar ?? 525);

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
            status: true,
          },
        },
        hotelStays: {
          orderBy: { checkInDate: "asc" },
        },
        _count: {
          select: { individualQuotes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const calculatedOffers = offers.map((offer) => {
      const { trip } = offer;

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
