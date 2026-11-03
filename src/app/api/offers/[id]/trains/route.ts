import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { TrainTicketClass } from "@prisma/client";

export const dynamic = "force-dynamic";

const createTrainSchema = z.object({
  departureStation: z.string().min(2, "Departure station must be at least 2 characters"),
  arrivalStation: z.string().min(2, "Arrival station must be at least 2 characters"),
  travelDate: z.string().or(z.date()).optional().nullable(),
  ticketClass: z.nativeEnum(TrainTicketClass).default(TrainTicketClass.ECONOMY),
  ticketPriceSar: z.number().min(0, "Ticket price must be non-negative"),
  passengerCount: z.number().int().min(1, "Passenger count must be at least 1").default(1),
  isIncluded: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

// GET: List Haramain train expenses for an offer
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;

    const trains = await prisma.offerTrainExpense.findMany({
      where: { offerId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      trains: trains.map((tr) => ({
        ...tr,
        ticketPriceSar: Number(tr.ticketPriceSar),
        totalCostSar: Number(tr.ticketPriceSar) * tr.passengerCount,
      })),
    });
  } catch (error) {
    console.error("Error fetching train expenses:", error);
    return NextResponse.json({ error: "Failed to fetch train expenses" }, { status: 500 });
  }
}

// POST: Add a Haramain train expense to an offer
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: offerId } = await params;

    const body = await req.json();
    const parsed = createTrainSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const data = parsed.data;

    const train = await prisma.offerTrainExpense.create({
      data: {
        offerId,
        departureStation: data.departureStation,
        arrivalStation: data.arrivalStation,
        travelDate: data.travelDate ? new Date(data.travelDate) : null,
        ticketClass: data.ticketClass,
        ticketPriceSar: data.ticketPriceSar,
        passengerCount: data.passengerCount,
        isIncluded: data.isIncluded,
        notes: data.notes || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Haramain train journey added successfully to offer",
        train: {
          ...train,
          ticketPriceSar: Number(train.ticketPriceSar),
          totalCostSar: Number(train.ticketPriceSar) * train.passengerCount,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating train expense:", error);
    const message = error instanceof Error ? error.message : "Creation failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
