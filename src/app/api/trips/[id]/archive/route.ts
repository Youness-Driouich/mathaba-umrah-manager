import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { TripStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const trip = await prisma.umrahTrip.findUnique({
      where: { id },
      select: { id: true, status: true, name: true },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const nextStatus =
      trip.status === TripStatus.ARCHIVED ? TripStatus.ACTIVE : TripStatus.ARCHIVED;

    const updated = await prisma.umrahTrip.update({
      where: { id },
      data: { status: nextStatus },
    });

    return NextResponse.json({
      success: true,
      message: `Trip "${trip.name}" is now ${nextStatus.toLowerCase()}`,
      status: updated.status,
    });
  } catch (error: unknown) {
    console.error("Error toggling trip archive status:", error);
    const message = error instanceof Error ? error.message : "Archive failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
