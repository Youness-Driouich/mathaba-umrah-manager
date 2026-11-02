import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { CostAllocationType, Currency, TripStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateTripSchema = z.object({
  name: z.string().min(3).optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  expectedPilgrims: z.number().int().min(1).optional(),
  airlineName: z.string().optional().nullable(),
  flightCost: z.number().min(0).optional(),
  flightCurrency: z.nativeEnum(Currency).optional(),
  flightAllocationType: z.nativeEnum(CostAllocationType).optional(),
  sarToMadRate: z.number().gt(0).optional(),
  eurToMadRate: z.number().gt(0).optional(),
  groupBusCostSar: z.number().min(0).optional(),
  groupBusCount: z.number().int().min(1).optional(),
  status: z.nativeEnum(TripStatus).optional(),
  notes: z.string().optional().nullable(),
});

// GET: Single Trip details with offers
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trip = await prisma.umrahTrip.findUnique({
      where: { id },
      include: {
        offers: {
          include: {
            _count: {
              select: { hotelStays: true, individualQuotes: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      trip: {
        ...trip,
        flightCost: Number(trip.flightCost),
        sarToMadRate: Number(trip.sarToMadRate),
        eurToMadRate: Number(trip.eurToMadRate),
        groupBusCostSar: Number(trip.groupBusCostSar),
        offers: trip.offers.map((o) => ({
          ...o,
          fixedProfitMad: Number(o.fixedProfitMad),
          hotelStaysCount: o._count.hotelStays,
          quotesCount: o._count.individualQuotes,
        })),
      },
    });
  } catch (error) {
    console.error("Error retrieving trip:", error);
    return NextResponse.json({ error: "Failed to retrieve trip" }, { status: 500 });
  }
}

// PUT: Update trip details
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = updateTripSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const updated = await prisma.umrahTrip.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        ...(data.expectedPilgrims !== undefined ? { expectedPilgrims: data.expectedPilgrims } : {}),
        ...(data.airlineName !== undefined ? { airlineName: data.airlineName } : {}),
        ...(data.flightCost !== undefined ? { flightCost: data.flightCost } : {}),
        ...(data.flightCurrency ? { flightCurrency: data.flightCurrency } : {}),
        ...(data.flightAllocationType ? { flightAllocationType: data.flightAllocationType } : {}),
        ...(data.sarToMadRate !== undefined ? { sarToMadRate: data.sarToMadRate } : {}),
        ...(data.eurToMadRate !== undefined ? { eurToMadRate: data.eurToMadRate } : {}),
        ...(data.groupBusCostSar !== undefined ? { groupBusCostSar: data.groupBusCostSar } : {}),
        ...(data.groupBusCount !== undefined ? { groupBusCount: data.groupBusCount } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Trip updated successfully",
      trip: {
        ...updated,
        flightCost: Number(updated.flightCost),
        sarToMadRate: Number(updated.sarToMadRate),
        eurToMadRate: Number(updated.eurToMadRate),
        groupBusCostSar: Number(updated.groupBusCostSar),
      },
    });
  } catch (error: unknown) {
    console.error("Error updating trip:", error);
    const message = error instanceof Error ? error.message : "Update failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE: Delete a trip
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await prisma.umrahTrip.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Trip deleted successfully from Neon database",
    });
  } catch (error: unknown) {
    console.error("Error deleting trip:", error);
    const message = error instanceof Error ? error.message : "Deletion failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
