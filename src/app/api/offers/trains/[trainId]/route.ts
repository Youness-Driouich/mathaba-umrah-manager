import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { TrainTicketClass } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateTrainSchema = z.object({
  departureStation: z.string().min(2).optional(),
  arrivalStation: z.string().min(2).optional(),
  travelDate: z.string().or(z.date()).optional().nullable(),
  ticketClass: z.nativeEnum(TrainTicketClass).optional(),
  ticketPriceSar: z.number().min(0).optional(),
  passengerCount: z.number().int().min(1).optional(),
  isIncluded: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

// PUT: Update a Haramain train expense
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ trainId: string }> }
) {
  try {
    await requireAdmin();
    const { trainId } = await params;

    const body = await req.json();
    const parsed = updateTrainSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const updated = await prisma.offerTrainExpense.update({
      where: { id: trainId },
      data: {
        ...(data.departureStation ? { departureStation: data.departureStation } : {}),
        ...(data.arrivalStation ? { arrivalStation: data.arrivalStation } : {}),
        ...(data.travelDate !== undefined
          ? { travelDate: data.travelDate ? new Date(data.travelDate) : null }
          : {}),
        ...(data.ticketClass ? { ticketClass: data.ticketClass } : {}),
        ...(data.ticketPriceSar !== undefined ? { ticketPriceSar: data.ticketPriceSar } : {}),
        ...(data.passengerCount !== undefined ? { passengerCount: data.passengerCount } : {}),
        ...(data.isIncluded !== undefined ? { isIncluded: data.isIncluded } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Train journey updated successfully",
      train: {
        ...updated,
        ticketPriceSar: Number(updated.ticketPriceSar),
        totalCostSar: Number(updated.ticketPriceSar) * updated.passengerCount,
      },
    });
  } catch (error: unknown) {
    console.error("Error updating train expense:", error);
    const message = error instanceof Error ? error.message : "Update failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE: Delete a Haramain train expense
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ trainId: string }> }
) {
  try {
    await requireAdmin();
    const { trainId } = await params;

    await prisma.offerTrainExpense.delete({
      where: { id: trainId },
    });

    return NextResponse.json({
      success: true,
      message: "Train journey removed successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting train expense:", error);
    const message = error instanceof Error ? error.message : "Deletion failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
