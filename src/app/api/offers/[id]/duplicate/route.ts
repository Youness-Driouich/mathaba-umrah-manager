import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const originalOffer = await prisma.offer.findUnique({
      where: { id },
      include: {
        hotelStays: true,
        services: true,
        trainExpenses: true,
      },
    });

    if (!originalOffer) {
      return NextResponse.json({ error: "Source offer not found" }, { status: 404 });
    }

    const clonedOffer = await prisma.offer.create({
      data: {
        tripId: originalOffer.tripId,
        name: `${originalOffer.name} (Copy)`,
        fixedProfitMad: originalOffer.fixedProfitMad,
        isActive: originalOffer.isActive,
        notes: originalOffer.notes ? `Cloned from "${originalOffer.name}". ${originalOffer.notes}` : `Cloned from "${originalOffer.name}".`,
        hotelStays: {
          create: originalOffer.hotelStays.map((stay) => ({
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
          create: originalOffer.services.map((svc) => ({
            serviceName: svc.serviceName,
            costAmount: svc.costAmount,
            currency: svc.currency,
            costScope: svc.costScope,
            notes: svc.notes,
          })),
        },
      },
      include: {
        hotelStays: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Offer "${originalOffer.name}" duplicated successfully. Complete offer independence guaranteed.`,
      offer: {
        ...clonedOffer,
        fixedProfitMad: Number(clonedOffer.fixedProfitMad),
      },
    });
  } catch (error: unknown) {
    console.error("Error duplicating offer:", error);
    const message = error instanceof Error ? error.message : "Duplication failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
