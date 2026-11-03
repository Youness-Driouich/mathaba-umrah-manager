import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    await requireAdmin();
    const { quoteId } = await params;
    const body = await req.json().catch(() => ({}));
    const newPilgrimName = body?.pilgrimName?.trim();

    const originalQuote = await prisma.individualPilgrimQuote.findUnique({
      where: { id: quoteId },
      include: {
        customizations: true,
      },
    });

    if (!originalQuote) {
      return NextResponse.json({ error: "Original quote not found" }, { status: 404 });
    }

    const duplicatedQuote = await prisma.individualPilgrimQuote.create({
      data: {
        offerId: originalQuote.offerId,
        pilgrimName: newPilgrimName || `${originalQuote.pilgrimName} (نسخة مكررة)`,
        contactPhone: originalQuote.contactPhone,
        roomCategory: originalQuote.roomCategory,
        overrideProfitMad: originalQuote.overrideProfitMad,
        commercialDiscountMad: originalQuote.commercialDiscountMad,
        arbitraryAdjustmentMad: originalQuote.arbitraryAdjustmentMad,
        adjustmentReason: originalQuote.adjustmentReason,
        snapshotData: originalQuote.snapshotData as any,
        status: "DRAFT",
        customizations: {
          create: originalQuote.customizations.map((c) => ({
            type: c.type,
            description: c.description,
            supplierCostDeltaMad: c.supplierCostDeltaMad,
            sellingPriceDeltaMad: c.sellingPriceDeltaMad,
            details: c.details as any,
          })),
        },
      },
      include: {
        customizations: true,
      },
    });

    return NextResponse.json(
      {
        quote: {
          ...duplicatedQuote,
          overrideProfitMad: duplicatedQuote.overrideProfitMad ? Number(duplicatedQuote.overrideProfitMad) : null,
          commercialDiscountMad: Number(duplicatedQuote.commercialDiscountMad),
          arbitraryAdjustmentMad: Number(duplicatedQuote.arbitraryAdjustmentMad),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: "Unauthorized" }, { status: error.status });
    }
    console.error("Error duplicating quote:", error);
    return NextResponse.json({ error: "Failed to duplicate quote" }, { status: 500 });
  }
}
