import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { computeOfferCalculation } from "@/core/finance/offer-helper";
import { calculateIndividualQuote } from "@/core/finance/calculator";
import { buildInternalFinancialReportData } from "@/core/finance/projection";
import { renderInternalFinancialReportHtml } from "@/core/documents/internal-report-template";
import { generatePdfFromHtml } from "@/core/documents/pdf-generator";
import { QuoteStatus } from "@prisma/client";
import { DOCUMENT_NO_CACHE_HEADERS } from "@/core/documents/headers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Strictly require authorized administrator session
    await requireAdmin();

    const { id: quoteId } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    const quote = await prisma.individualPilgrimQuote.findUnique({
      where: { id: quoteId },
      include: {
        offer: {
          include: {
            trip: true,
            hotelStays: { orderBy: { checkInDate: "asc" } },
            additionalTransports: { orderBy: { createdAt: "asc" } },
            trainExpenses: { orderBy: { createdAt: "asc" } },
            services: true,
          },
        },
        customizations: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const { offer } = quote;
    const { trip } = offer;
    const settings = await prisma.globalSetting.findFirst();

    // Baseline calculation from current offer (or fallback)
    const baselineCalc = computeOfferCalculation(offer);
    const snapshot = quote.snapshotData as any;

    let baselineBreakdown: any = null;
    if (snapshot?.roomBreakdowns?.[quote.roomCategory]) {
      baselineBreakdown = snapshot.roomBreakdowns[quote.roomCategory];
    } else {
      baselineBreakdown = baselineCalc.roomBreakdowns[quote.roomCategory as keyof typeof baselineCalc.roomBreakdowns];
    }

    const calcResult = calculateIndividualQuote(quote.pilgrimName, {
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

    const hotelStaysBreakdown = baselineCalc.hotelStays.map((stay) => {
      const dbStay = offer.hotelStays.find((s) => s.hotelName === stay.hotelName);
      return {
        hotelName: stay.hotelName,
        city: stay.city,
        checkInDate: dbStay ? new Date(dbStay.checkInDate).toISOString().split("T")[0] : "",
        checkOutDate: dbStay ? new Date(dbStay.checkOutDate).toISOString().split("T")[0] : "",
        nights: stay.nightsCount,
        isOverridden: stay.isOverridden,
        singleDoubleRateSar: dbStay ? Number(dbStay.singleDoubleRateSar) : 0,
        tripleRateSar: dbStay ? Number(dbStay.tripleRateSar) : 0,
        quadRateSar: dbStay ? Number(dbStay.quadRateSar) : 0,
        fullRoomTotalSar:
          quote.roomCategory === "QUAD"
            ? stay.fullRoomTotalCostSar.quad.toNumber()
            : quote.roomCategory === "TRIPLE"
            ? stay.fullRoomTotalCostSar.triple.toNumber()
            : stay.fullRoomTotalCostSar.singleDouble.toNumber(),
        perPersonSar: stay.perPersonCostSar[quote.roomCategory].toNumber(),
        perPersonMad: stay.perPersonCostMad[quote.roomCategory].toNumber(),
      };
    });

    const reportData = buildInternalFinancialReportData({
      reportReference: `MTH-AUDIT-Q-${quote.id.substring(0, 6).toUpperCase()}`,
      generationDate: new Date().toISOString().split("T")[0],
      isDraft: quote.status === QuoteStatus.DRAFT,
      agencyName: settings?.agencyName || "Mathaba Umrah Services",
      tripName: trip.name,
      tripDates: {
        start: new Date(trip.startDate).toISOString().split("T")[0],
        end: new Date(trip.endDate).toISOString().split("T")[0],
      },
      expectedPilgrims: trip.expectedPilgrims,
      exchangeRates: {
        sarToMad: Number(trip.sarToMadRate),
        eurToMad: Number(trip.eurToMadRate),
      },
      offerName: offer.name,
      pilgrimName: quote.pilgrimName,
      isIndividualQuote: true,
      roomCategory: quote.roomCategory,
      hotelStaysBreakdown,
      flightExpense: {
        amount: Number(trip.flightCost),
        currency: trip.flightCurrency,
        allocationType: trip.flightAllocationType,
        perPilgrimMad: baselineCalc.sharedCostsPerPilgrim.flightCostMad.toNumber(),
      },
      visaExpense: {
        perPilgrimSar: baselineCalc.sharedCostsPerPilgrim.visaCostSar.toNumber(),
        perPilgrimMad: baselineCalc.sharedCostsPerPilgrim.visaCostMad.toNumber(),
        isHistoricalSnapshot: true,
      },
      groupBusExpense: {
        totalCostSar: Number(trip.groupBusCostSar),
        pilgrimCount: trip.expectedPilgrims,
        perPilgrimSar: baselineCalc.sharedCostsPerPilgrim.groupBusCostSar.toNumber(),
        perPilgrimMad: baselineCalc.sharedCostsPerPilgrim.groupBusCostMad.toNumber(),
        isMaintained: true,
      },
      additionalTransports: offer.additionalTransports.map((t) => ({
        routeName: t.routeName,
        vehicleType: t.vehicleType,
        vehicleCount: t.vehicleCount,
        capacity: t.capacityPerVehicle,
        allocatedPilgrims: t.allocatedPilgrimsCount,
        priceSar: Number(t.actualPriceSar),
        perPilgrimSar: Number(t.actualPriceSar) / Math.max(1, t.allocatedPilgrimsCount),
        perPilgrimMad:
          (Number(t.actualPriceSar) / Math.max(1, t.allocatedPilgrimsCount)) *
          Number(trip.sarToMadRate),
        isIncluded: t.isIncludedInPackage,
      })),
      trainExpenses: offer.trainExpenses.map((tr) => ({
        departureStation: tr.departureStation,
        arrivalStation: tr.arrivalStation,
        ticketClass: tr.ticketClass,
        ticketPriceSar: Number(tr.ticketPriceSar),
        passengerCount: tr.passengerCount,
        perPilgrimMad: Number(tr.ticketPriceSar) * Number(trip.sarToMadRate),
        isIncluded: tr.isIncluded,
      })),
      additionalServices: offer.services.map((s) => ({
        serviceName: s.serviceName,
        amount: Number(s.costAmount),
        currency: s.currency,
        perPilgrimMad: Number(s.costAmount) * (s.currency === "SAR" ? Number(trip.sarToMadRate) : 1),
      })),
      individualCustomizations: quote.customizations.map((c) => ({
        type: c.type,
        description: c.description,
        supplierCostDeltaMad: Number(c.supplierCostDeltaMad),
        isRecoverable: (c.details as any)?.isRecoverable ?? true,
        details: c.details,
      })),
      roomPricingSummary: {
        baseActualCostMad: calcResult.supplierCostMad.toNumber(),
        supplierCostAdditionsMad: calcResult.supplierCostAdditionsMad.toNumber(),
        supplierCostReductionsMad: calcResult.supplierCostReductionsMad.toNumber(),
        netSupplierCostDeltaMad: calcResult.supplierCostDeltaMad.toNumber(),
        newActualCostMad: calcResult.totalEffectiveCostMad.toNumber(),
        configuredProfitMad: calcResult.baseProfitMad.toNumber(),
        isProfitOverridden: calcResult.isProfitOverridden,
        commercialDiscountMad: calcResult.appliedDiscountMad.toNumber(),
        finalSellingPriceMad: calcResult.finalSellingPriceMad.toNumber(),
        realizedProfitMad: calcResult.netProfitMad.toNumber(),
      },
    });

    if (format === "html") {
      const html = renderInternalFinancialReportHtml(reportData);
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...DOCUMENT_NO_CACHE_HEADERS,
        },
      });
    }

    if (format === "pdf") {
      const html = renderInternalFinancialReportHtml(reportData);
      const pdfBuffer = await generatePdfFromHtml(html);
      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="Mathaba-Internal-Report-${quote.pilgrimName.replace(/\s+/g, "-")}.pdf"`,
          ...DOCUMENT_NO_CACHE_HEADERS,
        },
      });
    }

    return NextResponse.json({ report: reportData }, { headers: DOCUMENT_NO_CACHE_HEADERS });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403 || error?.message?.includes("Unauthorized") || error?.message?.includes("Forbidden")) {
      const status = error.status || (error.message?.includes("Forbidden") ? 403 : 401);
      return NextResponse.json({ error: error.message || "Unauthorized access to confidential report" }, { status, headers: DOCUMENT_NO_CACHE_HEADERS });
    }
    console.error("Error generating individual internal report:", error);
    return NextResponse.json({ error: "Failed to generate internal report" }, { status: 500, headers: DOCUMENT_NO_CACHE_HEADERS });
  }
}
