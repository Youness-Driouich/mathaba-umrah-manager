import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { calculateBaselineOffer } from "@/core/finance/calculator";
import { HotelStayInput } from "@/core/finance/types";

export const dynamic = "force-dynamic";

const updateOfferSchema = z.object({
  name: z.string().min(2).optional(),
  fixedProfitMad: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET: Full offer with hotel stays & financial matrix
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        trip: true,
        hotelStays: {
          orderBy: { checkInDate: "asc" },
        },
        services: true,
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const { trip } = offer;

    // Global visa fee
    const globalSettings = await prisma.globalSetting.findUnique({
      where: { id: "default" },
    });
    const visaCostSar = Number(globalSettings?.defaultVisaCostSar ?? 525);

    // Compute live matrix
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

    const calculation = calculateBaselineOffer({
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

    return NextResponse.json({
      success: true,
      offer: {
        id: offer.id,
        name: offer.name,
        fixedProfitMad: Number(offer.fixedProfitMad),
        isActive: offer.isActive,
        notes: offer.notes,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
        hotelStays: offer.hotelStays.map((s) => ({
          ...s,
          singleDoubleRateSar: Number(s.singleDoubleRateSar),
          tripleRateSar: Number(s.tripleRateSar),
          quadRateSar: Number(s.quadRateSar),
        })),
        trip: {
          id: trip.id,
          name: trip.name,
          slug: trip.slug,
          startDate: trip.startDate,
          endDate: trip.endDate,
          expectedPilgrims: trip.expectedPilgrims,
          flightCost: Number(trip.flightCost),
          flightCurrency: trip.flightCurrency,
          sarToMadRate: Number(trip.sarToMadRate),
          eurToMadRate: Number(trip.eurToMadRate),
          groupBusCostSar: Number(trip.groupBusCostSar),
          visaCostSar,
        },
        matrix: calculation.roomBreakdowns,
        sharedCosts: calculation.sharedCostsPerPilgrim,
      },
    });
  } catch (error) {
    console.error("Error retrieving offer details:", error);
    return NextResponse.json({ error: "Failed to retrieve offer" }, { status: 500 });
  }
}

// PUT: Update offer
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = updateOfferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await prisma.offer.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({
      success: true,
      message: "Offer updated successfully in Neon",
      offer: {
        ...updated,
        fixedProfitMad: Number(updated.fixedProfitMad),
      },
    });
  } catch (error: unknown) {
    console.error("Error updating offer:", error);
    const message = error instanceof Error ? error.message : "Update failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE: Delete offer
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await prisma.offer.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting offer:", error);
    const message = error instanceof Error ? error.message : "Deletion failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
