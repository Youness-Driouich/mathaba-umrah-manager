import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { calculateStayNights } from "@/core/finance/calculator";
import { City } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateHotelStaySchema = z.object({
  city: z.nativeEnum(City).optional(),
  hotelName: z.string().min(2).optional(),
  checkInDate: z.string().or(z.date()).optional(),
  checkOutDate: z.string().or(z.date()).optional(),
  singleDoubleRateSar: z.number().min(0).optional(),
  tripleRateSar: z.number().min(0).optional(),
  quadRateSar: z.number().min(0).optional(),
  manualNightsOverride: z.number().int().positive().optional().nullable(),
  restoreAutoCalculation: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

// PUT: Update hotel stay (dates, rates, or night override)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ stayId: string }> }
) {
  try {
    await requireAdmin();
    const { stayId } = await params;

    const body = await req.json();
    const parsed = updateHotelStaySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.offerHotelStay.findUnique({
      where: { id: stayId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Hotel stay not found" }, { status: 404 });
    }

    const checkIn = data.checkInDate ? new Date(data.checkInDate) : existing.checkInDate;
    const checkOut = data.checkOutDate ? new Date(data.checkOutDate) : existing.checkOutDate;

    let nights = existing.nightsCount;
    let isOverridden = existing.isNightsOverridden;

    if (data.restoreAutoCalculation) {
      const auto = calculateStayNights(checkIn, checkOut, null);
      nights = auto.nights;
      isOverridden = false;
    } else if (data.manualNightsOverride !== undefined && data.manualNightsOverride !== null) {
      const manual = calculateStayNights(checkIn, checkOut, data.manualNightsOverride);
      nights = manual.nights;
      isOverridden = manual.isOverridden;
    } else if (data.checkInDate || data.checkOutDate) {
      // If dates changed without an override, recalculate
      const auto = calculateStayNights(checkIn, checkOut, isOverridden ? existing.nightsCount : null);
      nights = auto.nights;
      isOverridden = auto.isOverridden;
    }

    const updated = await prisma.offerHotelStay.update({
      where: { id: stayId },
      data: {
        ...(data.city ? { city: data.city } : {}),
        ...(data.hotelName ? { hotelName: data.hotelName } : {}),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        nightsCount: nights,
        isNightsOverridden: isOverridden,
        ...(data.singleDoubleRateSar !== undefined ? { singleDoubleRateSar: data.singleDoubleRateSar } : {}),
        ...(data.tripleRateSar !== undefined ? { tripleRateSar: data.tripleRateSar } : {}),
        ...(data.quadRateSar !== undefined ? { quadRateSar: data.quadRateSar } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Hotel stay updated successfully",
      stay: {
        ...updated,
        singleDoubleRateSar: Number(updated.singleDoubleRateSar),
        tripleRateSar: Number(updated.tripleRateSar),
        quadRateSar: Number(updated.quadRateSar),
      },
    });
  } catch (error: unknown) {
    console.error("Error updating hotel stay:", error);
    const message = error instanceof Error ? error.message : "Update failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE: Delete hotel stay
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ stayId: string }> }
) {
  try {
    await requireAdmin();
    const { stayId } = await params;

    await prisma.offerHotelStay.delete({
      where: { id: stayId },
    });

    return NextResponse.json({
      success: true,
      message: "Hotel stay removed from package",
    });
  } catch (error: unknown) {
    console.error("Error deleting hotel stay:", error);
    const message = error instanceof Error ? error.message : "Delete failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
