import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { computeOfferCalculation } from "@/core/finance/offer-helper";
import { calculateIndividualQuote } from "@/core/finance/calculator";
import { RoomCategory, QuoteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateQuoteSchema = z.object({
  pilgrimName: z.string().min(2).optional(),
  contactPhone: z.string().optional().nullable(),
  roomCategory: z.nativeEnum(RoomCategory).optional(),
  overrideProfitMad: z.number().min(0).optional().nullable(),
  commercialDiscountMad: z.number().min(0).optional(),
  arbitraryAdjustmentMad: z.number().optional(),
  adjustmentReason: z.string().optional().nullable(),
  status: z.nativeEnum(QuoteStatus).optional(),
  refreshSnapshot: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const { quoteId } = await params;

    const quote = await prisma.individualPilgrimQuote.findUnique({
      where: { id: quoteId },
      include: {
        offer: {
          include: {
            trip: true,
            hotelStays: { orderBy: { checkInDate: "asc" } },
            additionalTransports: { orderBy: { createdAt: "asc" } },
            trainExpenses: { orderBy: { createdAt: "asc" } },
          },
        },
        customizations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const { offer } = quote;
    const { trip } = offer;

    // Baseline calculation from current offer (or fallback)
    const baselineCalc = computeOfferCalculation(offer);

    // Snapshot protection check
    const snapshot = quote.snapshotData as any;
    const baselineBreakdown =
      snapshot?.roomBreakdowns?.[quote.roomCategory] ||
      baselineCalc.roomBreakdowns[quote.roomCategory as keyof typeof baselineCalc.roomBreakdowns];

    const calculation = calculateIndividualQuote(quote.pilgrimName, {
      baselineBreakdown,
      overrideProfitMad: quote.overrideProfitMad ? Number(quote.overrideProfitMad) : null,
      commercialDiscountMad: Number(quote.commercialDiscountMad || 0),
      arbitraryCostAdjustmentMad: Number(quote.arbitraryAdjustmentMad || 0),
      arbitraryAdjustmentReason: quote.adjustmentReason || undefined,
      customizationItems: quote.customizations.map((c) => ({
        id: c.id,
        type: c.type,
        description: c.description,
        supplierCostDeltaMad: Number(c.supplierCostDeltaMad),
        sellingPriceDeltaMad: Number(c.sellingPriceDeltaMad),
        details: c.details as any,
      })),
    });

    return NextResponse.json({
      quote: {
        id: quote.id,
        offerId: quote.offerId,
        offerName: offer.name,
        tripId: trip.id,
        tripName: trip.name,
        pilgrimName: quote.pilgrimName,
        contactPhone: quote.contactPhone,
        roomCategory: quote.roomCategory,
        overrideProfitMad: quote.overrideProfitMad ? Number(quote.overrideProfitMad) : null,
        commercialDiscountMad: Number(quote.commercialDiscountMad),
        arbitraryAdjustmentMad: Number(quote.arbitraryAdjustmentMad),
        adjustmentReason: quote.adjustmentReason,
        status: quote.status,
        snapshotData: quote.snapshotData,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
        customizations: quote.customizations.map((c) => ({
          id: c.id,
          quoteId: c.quoteId,
          type: c.type,
          description: c.description,
          supplierCostDeltaMad: Number(c.supplierCostDeltaMad),
          sellingPriceDeltaMad: Number(c.sellingPriceDeltaMad),
          details: c.details,
          createdAt: c.createdAt,
        })),
        originalBaseline: {
          roomCategory: baselineBreakdown.roomCategory,
          hotelCostMad: Number(baselineBreakdown.hotelCostMad),
          flightCostMad: Number(baselineBreakdown.flightCostMad),
          groupBusCostMad: Number(baselineBreakdown.groupBusCostMad),
          additionalTransportCostMad: Number(baselineBreakdown.additionalTransportCostMad),
          trainCostMad: Number(baselineBreakdown.trainCostMad),
          visaCostMad: Number(baselineBreakdown.visaCostMad),
          servicesCostMad: Number(baselineBreakdown.servicesCostMad),
          totalActualCostMad: Number(baselineBreakdown.totalActualCostMad),
          configuredProfitMad: Number(baselineBreakdown.configuredProfitMad),
          sellingPriceBeforeDiscountMad: Number(baselineBreakdown.sellingPriceBeforeDiscountMad),
          discountMad: Number(baselineBreakdown.discountMad),
          finalSellingPriceMad: Number(baselineBreakdown.finalSellingPriceMad),
          effectiveProfitMad: Number(baselineBreakdown.effectiveProfitMad),
        },
        calculation: {
          baseCostMad: calculation.supplierCostMad.toNumber(),
          supplierCostDeltaMad: calculation.supplierCostDeltaMad.toNumber(),
          supplierCostAdditionsMad: calculation.supplierCostAdditionsMad.toNumber(),
          supplierCostReductionsMad: calculation.supplierCostReductionsMad.toNumber(),
          newActualCostMad: calculation.totalEffectiveCostMad.toNumber(),
          baseProfitMad: calculation.baseProfitMad.toNumber(),
          isProfitOverridden: calculation.isProfitOverridden,
          appliedDiscountMad: calculation.appliedDiscountMad.toNumber(),
          finalSellingPriceMad: calculation.finalSellingPriceMad.toNumber(),
          realizedProfitMad: calculation.netProfitMad.toNumber(),
          isDeficit: calculation.isDeficit,
        },
      },
    });
  } catch (error) {
    console.error("Error retrieving quote:", error);
    return NextResponse.json({ error: "Failed to retrieve quote" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    await requireAdmin();
    const { quoteId } = await params;
    const body = await req.json();
    const parsed = updateQuoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existingQuote = await prisma.individualPilgrimQuote.findUnique({
      where: { id: quoteId },
      include: {
        offer: {
          include: {
            trip: true,
            hotelStays: true,
            additionalTransports: true,
            trainExpenses: true,
          },
        },
      },
    });

    if (!existingQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    let updatedSnapshot = existingQuote.snapshotData;
    if (parsed.data.refreshSnapshot) {
      const baselineCalc = computeOfferCalculation(existingQuote.offer);
      updatedSnapshot = JSON.parse(
        JSON.stringify({
          capturedAt: new Date().toISOString(),
          offerId: existingQuote.offer.id,
          offerName: existingQuote.offer.name,
          tripId: existingQuote.offer.trip.id,
          tripName: existingQuote.offer.trip.name,
          sarToMadRate: Number(existingQuote.offer.trip.sarToMadRate),
          eurToMadRate: Number(existingQuote.offer.trip.eurToMadRate),
          visaCostSar: Number(existingQuote.offer.trip.visaCostSar),
          fixedProfitMad: Number(existingQuote.offer.fixedProfitMad),
          roomBreakdowns: baselineCalc.roomBreakdowns,
          sharedCosts: baselineCalc.sharedCostsPerPilgrim,
        })
      );
    }

    const updated = await prisma.individualPilgrimQuote.update({
      where: { id: quoteId },
      data: {
        pilgrimName: parsed.data.pilgrimName !== undefined ? parsed.data.pilgrimName.trim() : undefined,
        contactPhone: parsed.data.contactPhone !== undefined ? (parsed.data.contactPhone?.trim() || null) : undefined,
        roomCategory: parsed.data.roomCategory,
        overrideProfitMad: parsed.data.overrideProfitMad !== undefined ? parsed.data.overrideProfitMad : undefined,
        commercialDiscountMad: parsed.data.commercialDiscountMad,
        arbitraryAdjustmentMad: parsed.data.arbitraryAdjustmentMad,
        adjustmentReason: parsed.data.adjustmentReason !== undefined ? (parsed.data.adjustmentReason?.trim() || null) : undefined,
        status: parsed.data.status,
        snapshotData: updatedSnapshot as any,
      },
    });

    return NextResponse.json({
      quote: {
        ...updated,
        overrideProfitMad: updated.overrideProfitMad ? Number(updated.overrideProfitMad) : null,
        commercialDiscountMad: Number(updated.commercialDiscountMad),
        arbitraryAdjustmentMad: Number(updated.arbitraryAdjustmentMad),
      },
    });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: "Unauthorized" }, { status: error.status });
    }
    console.error("Error updating quote:", error);
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    await requireAdmin();
    const { quoteId } = await params;

    await prisma.individualPilgrimQuote.delete({
      where: { id: quoteId },
    });

    return NextResponse.json({ success: true, message: "Quote deleted successfully" });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: "Unauthorized" }, { status: error.status });
    }
    console.error("Error deleting quote:", error);
    return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 });
  }
}
