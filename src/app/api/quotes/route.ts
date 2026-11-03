import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeOfferCalculation } from "@/core/finance/offer-helper";
import { calculateIndividualQuote } from "@/core/finance/calculator";
import { QuoteStatus, RoomCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") as QuoteStatus | null;
    const tripId = searchParams.get("tripId") || undefined;
    const offerId = searchParams.get("offerId") || undefined;

    const where: any = {};

    if (search) {
      where.OR = [
        { pilgrimName: { contains: search, mode: "insensitive" } },
        { contactPhone: { contains: search, mode: "insensitive" } },
        { offer: { name: { contains: search, mode: "insensitive" } } },
        { offer: { trip: { name: { contains: search, mode: "insensitive" } } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (offerId) {
      where.offerId = offerId;
    } else if (tripId) {
      where.offer = { tripId };
    }

    const quotes = await prisma.individualPilgrimQuote.findMany({
      where,
      include: {
        offer: {
          include: {
            trip: true,
            hotelStays: true,
            additionalTransports: true,
            trainExpenses: true,
          },
        },
        customizations: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const quotesWithCalculations = quotes.map((quote) => {
      const { offer } = quote;
      const snapshot = quote.snapshotData as any;
      let baselineBreakdown: any = null;

      if (snapshot?.roomBreakdowns?.[quote.roomCategory]) {
        baselineBreakdown = snapshot.roomBreakdowns[quote.roomCategory];
      } else {
        const baselineCalc = computeOfferCalculation(offer);
        baselineBreakdown = baselineCalc.roomBreakdowns[quote.roomCategory as keyof typeof baselineCalc.roomBreakdowns];
      }

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
        offerName: offer.name,
        tripId: offer.trip.id,
        tripName: offer.trip.name,
        pilgrimName: quote.pilgrimName,
        contactPhone: quote.contactPhone,
        roomCategory: quote.roomCategory,
        overrideProfitMad: quote.overrideProfitMad ? Number(quote.overrideProfitMad) : null,
        commercialDiscountMad: Number(quote.commercialDiscountMad),
        arbitraryAdjustmentMad: Number(quote.arbitraryAdjustmentMad),
        status: quote.status,
        customizationsCount: quote.customizations.length,
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
    console.error("Error retrieving quotes:", error);
    return NextResponse.json({ error: "Failed to retrieve quotes" }, { status: 500 });
  }
}
