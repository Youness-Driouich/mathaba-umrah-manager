import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { computeOfferCalculation } from "@/core/finance/offer-helper";
import { calculateIndividualQuote } from "@/core/finance/calculator";
import { RoomCategory, QuoteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const createQuoteSchema = z.object({
  pilgrimName: z.string().min(2, "Pilgrim name is required"),
  contactPhone: z.string().optional().nullable(),
  roomCategory: z.nativeEnum(RoomCategory).default(RoomCategory.DOUBLE),
  overrideProfitMad: z.number().min(0).optional().nullable(),
  commercialDiscountMad: z.number().min(0).default(0),
  arbitraryAdjustmentMad: z.number().default(0),
  adjustmentReason: z.string().optional().nullable(),
  status: z.nativeEnum(QuoteStatus).default(QuoteStatus.DRAFT),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        trip: true,
        hotelStays: true,
        additionalTransports: true,
        trainExpenses: true,
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const quotes = await prisma.individualPilgrimQuote.findMany({
      where: { offerId },
      include: {
        customizations: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute baseline offer breakdown
    const baselineCalc = computeOfferCalculation(offer);

    const quotesWithCalculations = quotes.map((quote) => {
      // Use snapshot if available, otherwise fallback to current baseline
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

      return {
        id: quote.id,
        offerId: quote.offerId,
        pilgrimName: quote.pilgrimName,
        contactPhone: quote.contactPhone,
        roomCategory: quote.roomCategory,
        overrideProfitMad: quote.overrideProfitMad ? Number(quote.overrideProfitMad) : null,
        commercialDiscountMad: Number(quote.commercialDiscountMad),
        arbitraryAdjustmentMad: Number(quote.arbitraryAdjustmentMad),
        adjustmentReason: quote.adjustmentReason,
        status: quote.status,
        customizationsCount: quote.customizations.length,
        customizations: quote.customizations.map((c) => ({
          ...c,
          supplierCostDeltaMad: Number(c.supplierCostDeltaMad),
          sellingPriceDeltaMad: Number(c.sellingPriceDeltaMad),
        })),
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
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
      };
    });

    return NextResponse.json({
      quotes: quotesWithCalculations,
      totalCount: quotes.length,
    });
  } catch (error) {
    console.error("Error retrieving offer quotes:", error);
    return NextResponse.json({ error: "Failed to retrieve quotes" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: offerId } = await params;
    const body = await req.json();
    const parsed = createQuoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        trip: true,
        hotelStays: true,
        additionalTransports: true,
        trainExpenses: true,
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Capture baseline snapshot for historical immutability (STEP 8)
    const baselineCalc = computeOfferCalculation(offer);
    const snapshotData = JSON.parse(
      JSON.stringify({
        capturedAt: new Date().toISOString(),
        offerId: offer.id,
        offerName: offer.name,
        tripId: offer.trip.id,
        tripName: offer.trip.name,
        sarToMadRate: Number(offer.trip.sarToMadRate),
        eurToMadRate: Number(offer.trip.eurToMadRate),
        visaCostSar: Number(offer.trip.visaCostSar),
        fixedProfitMad: Number(offer.fixedProfitMad),
        roomBreakdowns: baselineCalc.roomBreakdowns,
        sharedCosts: baselineCalc.sharedCostsPerPilgrim,
      })
    );

    const newQuote = await prisma.individualPilgrimQuote.create({
      data: {
        offerId,
        pilgrimName: parsed.data.pilgrimName.trim(),
        contactPhone: parsed.data.contactPhone?.trim() || null,
        roomCategory: parsed.data.roomCategory,
        overrideProfitMad: parsed.data.overrideProfitMad ?? null,
        commercialDiscountMad: parsed.data.commercialDiscountMad,
        arbitraryAdjustmentMad: parsed.data.arbitraryAdjustmentMad,
        adjustmentReason: parsed.data.adjustmentReason?.trim() || null,
        status: parsed.data.status,
        snapshotData,
      },
      include: {
        customizations: true,
      },
    });

    return NextResponse.json(
      {
        quote: {
          ...newQuote,
          overrideProfitMad: newQuote.overrideProfitMad ? Number(newQuote.overrideProfitMad) : null,
          commercialDiscountMad: Number(newQuote.commercialDiscountMad),
          arbitraryAdjustmentMad: Number(newQuote.arbitraryAdjustmentMad),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: "Unauthorized" }, { status: error.status });
    }
    console.error("Error creating individual quote:", error);
    return NextResponse.json({ error: "Failed to create individual quote" }, { status: 500 });
  }
}
