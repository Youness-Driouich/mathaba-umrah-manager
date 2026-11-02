import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { calculateStayNights } from "@/core/finance/calculator";
import { City } from "@prisma/client";

export const dynamic = "force-dynamic";

const createHotelStaySchema = z.object({
  city: z.nativeEnum(City),
  hotelName: z.string().min(2, "Hotel name must be at least 2 characters"),
  checkInDate: z.string().or(z.date()),
  checkOutDate: z.string().or(z.date()),
  singleDoubleRateSar: z.number().min(0, "Nightly rate must be non-negative"),
  tripleRateSar: z.number().min(0, "Nightly rate must be non-negative"),
  quadRateSar: z.number().min(0, "Nightly rate must be non-negative"),
  manualNightsOverride: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: offerId } = await params;

    const body = await req.json();
    const parsed = createHotelStaySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check offer exists
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
    });
    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Calculate nights using core calculation engine
    const { nights, isOverridden } = calculateStayNights(
      data.checkInDate,
      data.checkOutDate,
      data.manualNightsOverride
    );

    const stay = await prisma.offerHotelStay.create({
      data: {
        offerId,
        city: data.city,
        hotelName: data.hotelName,
        checkInDate: new Date(data.checkInDate),
        checkOutDate: new Date(data.checkOutDate),
        nightsCount: nights,
        isNightsOverridden: isOverridden,
        singleDoubleRateSar: data.singleDoubleRateSar,
        tripleRateSar: data.tripleRateSar,
        quadRateSar: data.quadRateSar,
        notes: data.notes || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Hotel stay added successfully to offer",
        stay: {
          ...stay,
          singleDoubleRateSar: Number(stay.singleDoubleRateSar),
          tripleRateSar: Number(stay.tripleRateSar),
          quadRateSar: Number(stay.quadRateSar),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error adding hotel stay:", error);
    const message = error instanceof Error ? error.message : "Failed to add hotel stay";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
