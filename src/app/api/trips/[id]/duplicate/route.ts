import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { TripStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // 1. Fetch original trip with its complete offer hierarchy
    const originalTrip = await prisma.umrahTrip.findUnique({
      where: { id },
      include: {
        offers: {
          include: {
            hotelStays: true,
            services: true,
            trainExpenses: true,
          },
        },
      },
    });

    if (!originalTrip) {
      return NextResponse.json({ error: "Source trip not found" }, { status: 404 });
    }

    const newName = `${originalTrip.name} (Copy)`;
    const newSlug = `${originalTrip.slug}-copy-${Date.now().toString().slice(-6)}`;

    // 2. Clone the trip with deep copy of offers, ensuring snapshot isolation
    const duplicatedTrip = await prisma.umrahTrip.create({
      data: {
        name: newName,
        slug: newSlug,
        startDate: originalTrip.startDate,
        endDate: originalTrip.endDate,
        expectedPilgrims: originalTrip.expectedPilgrims,
        airlineName: originalTrip.airlineName,
        flightCost: originalTrip.flightCost,
        flightCurrency: originalTrip.flightCurrency,
        flightAllocationType: originalTrip.flightAllocationType,
        sarToMadRate: originalTrip.sarToMadRate,
        eurToMadRate: originalTrip.eurToMadRate,
        groupBusCostSar: originalTrip.groupBusCostSar,
        groupBusCount: originalTrip.groupBusCount,
        status: TripStatus.DRAFT, // Clones default to DRAFT for review
        notes: originalTrip.notes ? `Cloned from "${originalTrip.name}". ${originalTrip.notes}` : `Cloned from "${originalTrip.name}".`,
        offers: {
          create: originalTrip.offers.map((offer) => ({
            name: offer.name,
            fixedProfitMad: offer.fixedProfitMad,
            isActive: offer.isActive,
            notes: offer.notes,
            hotelStays: {
              create: offer.hotelStays.map((stay) => ({
                city: stay.city,
                hotelName: stay.hotelName,
                checkInDate: stay.checkInDate,
                checkOutDate: stay.checkOutDate,
                nightsCount: stay.nightsCount,
                isNightsOverridden: stay.isNightsOverridden,
                singleDoubleRateSar: stay.singleDoubleRateSar,
                tripleRateSar: stay.tripleRateSar,
                quadRateSar: stay.quadRateSar,
                notes: stay.notes,
              })),
            },
            services: {
              create: offer.services.map((svc) => ({
                serviceName: svc.serviceName,
                costAmount: svc.costAmount,
                currency: svc.currency,
                costScope: svc.costScope,
                notes: svc.notes,
              })),
            },
            trainExpenses: {
              create: offer.trainExpenses.map((train) => ({
                routeName: train.routeName,
                ticketPriceSar: train.ticketPriceSar,
                passengerCount: train.passengerCount,
                isIncluded: train.isIncluded,
              })),
            },
          })),
        },
      },
      include: {
        _count: { select: { offers: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Trip "${originalTrip.name}" duplicated successfully. Historical isolation preserved.`,
      trip: {
        ...duplicatedTrip,
        flightCost: Number(duplicatedTrip.flightCost),
        sarToMadRate: Number(duplicatedTrip.sarToMadRate),
        eurToMadRate: Number(duplicatedTrip.eurToMadRate),
        groupBusCostSar: Number(duplicatedTrip.groupBusCostSar),
        offersCount: duplicatedTrip._count.offers,
      },
    });
  } catch (error: unknown) {
    console.error("Error duplicating trip:", error);
    const message = error instanceof Error ? error.message : "Duplication failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
