import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { calculateBaselineOffer } from "@/core/finance/calculator";
import { HotelStayInput } from "@/core/finance/types";

export const dynamic = "force-dynamic";

const createOfferSchema = z.object({
  name: z.string().min(2, "Offer name must be at least 2 characters"),
  fixedProfitMad: z.number().min(0, "Profit must be non-negative").default(2000),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// GET: List all offers for a trip with their calculated room breakdown
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;

    const trip = await prisma.umrahTrip.findUnique({
      where: { id: tripId },
      include: {
        offers: {
          include: {
            hotelStays: {
              orderBy: { checkInDate: "asc" },
            },
            additionalTransports: {
              orderBy: { createdAt: "asc" },
            },
            trainExpenses: {
              orderBy: { createdAt: "asc" },
            },
            services: true,
            _count: {
              select: { individualQuotes: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Historical snapshot of visa cost from trip
    const visaCostSar = Number(trip.visaCostSar ?? 525);

    // Compute financial matrix for each offer
    const calculatedOffers = trip.offers.map((offer) => {
      const hotelStayInputs: HotelStayInput[] = offer.hotelStays.map((stay) => ({
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

      const offerCalculation = calculateBaselineOffer({
        offerName: offer.name,
        exchangeRates: {
          sarToMad: Number(trip.sarToMadRate),
          eurToMad: Number(trip.eurToMadRate),
        },
        hotelStays: hotelStayInputs,
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
        tripId: offer.tripId,
        name: offer.name,
        fixedProfitMad: Number(offer.fixedProfitMad),
        isActive: offer.isActive,
        notes: offer.notes,
        createdAt: offer.createdAt,
        hotelStaysCount: offer.hotelStays.length,
        additionalTransportsCount: offer.additionalTransports.length,
        trainExpensesCount: offer.trainExpenses.length,
        hotelStays: offer.hotelStays.map((s) => ({
          ...s,
          singleDoubleRateSar: Number(s.singleDoubleRateSar),
          tripleRateSar: Number(s.tripleRateSar),
          quadRateSar: Number(s.quadRateSar),
        })),
        additionalTransports: offer.additionalTransports.map((t) => ({
          ...t,
          supplierReferencePrice: Number(t.supplierReferencePrice),
          actualPriceSar: Number(t.actualPriceSar),
        })),
        trainExpenses: offer.trainExpenses.map((tr) => ({
          ...tr,
          ticketPriceSar: Number(tr.ticketPriceSar),
        })),
        quotesCount: offer._count.individualQuotes,
        matrix: offerCalculation.roomBreakdowns,
        sharedCosts: offerCalculation.sharedCostsPerPilgrim,
        additionalTransportsSummary: offerCalculation.additionalTransportsSummary,
        trainExpensesSummary: offerCalculation.trainExpensesSummary,
      };
    });

    return NextResponse.json({
      success: true,
      trip: {
        id: trip.id,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        expectedPilgrims: trip.expectedPilgrims,
        flightCost: Number(trip.flightCost),
        flightCurrency: trip.flightCurrency,
        sarToMadRate: Number(trip.sarToMadRate),
        eurToMadRate: Number(trip.eurToMadRate),
        groupBusCostSar: Number(trip.groupBusCostSar),
        defaultVisaCostSar: visaCostSar,
      },
      offers: calculatedOffers,
    });
  } catch (error) {
    console.error("Error fetching trip offers:", error);
    return NextResponse.json({ error: "Failed to fetch offers" }, { status: 500 });
  }
}

// POST: Create a new offer in a trip
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: tripId } = await params;

    const body = await req.json();
    const parsed = createOfferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const trip = await prisma.umrahTrip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const offer = await prisma.offer.create({
      data: {
        tripId,
        name: parsed.data.name,
        fixedProfitMad: parsed.data.fixedProfitMad,
        notes: parsed.data.notes || null,
        isActive: parsed.data.isActive,
      },
      include: {
        hotelStays: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Offer "${offer.name}" created successfully in Neon`,
        offer: {
          ...offer,
          fixedProfitMad: Number(offer.fixedProfitMad),
          hotelStaysCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating offer:", error);
    const message = error instanceof Error ? error.message : "Creation failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
