import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { computeOfferCalculation } from "@/core/finance/offer-helper";
import { buildInternalFinancialReportData } from "@/core/finance/projection";
import { renderInternalFinancialReportHtml } from "@/core/documents/internal-report-template";
import { generatePdfFromHtml } from "@/core/documents/pdf-generator";
import { RoomCategoryType } from "@/core/finance/types";
import { DOCUMENT_NO_CACHE_HEADERS } from "@/core/documents/headers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Strictly require authorized administrator session
    await requireAdmin();

    const { id: offerId } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const requestedCategory = (searchParams.get("roomCategory") || "DOUBLE") as RoomCategoryType;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        trip: true,
        hotelStays: { orderBy: { checkInDate: "asc" } },
        additionalTransports: { orderBy: { createdAt: "asc" } },
        trainExpenses: { orderBy: { createdAt: "asc" } },
        services: true,
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const settings = await prisma.globalSetting.findFirst();
    const baselineCalc = computeOfferCalculation(offer);
    const roomBreakdown = baselineCalc.roomBreakdowns[requestedCategory];

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
          requestedCategory === "QUAD"
            ? stay.fullRoomTotalCostSar.quad.toNumber()
            : requestedCategory === "TRIPLE"
            ? stay.fullRoomTotalCostSar.triple.toNumber()
            : stay.fullRoomTotalCostSar.singleDouble.toNumber(),
        perPersonSar: stay.perPersonCostSar[requestedCategory].toNumber(),
        perPersonMad: stay.perPersonCostMad[requestedCategory].toNumber(),
      };
    });

    const reportData = buildInternalFinancialReportData({
      reportReference: `MTH-AUDIT-OF-${offer.id.substring(0, 6).toUpperCase()}`,
      generationDate: new Date().toISOString().split("T")[0],
      isDraft: !offer.isActive,
      agencyName: settings?.agencyName || "Mathaba Umrah Services",
      tripName: offer.trip.name,
      tripDates: {
        start: new Date(offer.trip.startDate).toISOString().split("T")[0],
        end: new Date(offer.trip.endDate).toISOString().split("T")[0],
      },
      expectedPilgrims: offer.trip.expectedPilgrims,
      exchangeRates: {
        sarToMad: Number(offer.trip.sarToMadRate),
        eurToMad: Number(offer.trip.eurToMadRate),
      },
      offerName: offer.name,
      isIndividualQuote: false,
      roomCategory: requestedCategory,
      hotelStaysBreakdown,
      flightExpense: {
        amount: Number(offer.trip.flightCost),
        currency: offer.trip.flightCurrency,
        allocationType: offer.trip.flightAllocationType,
        perPilgrimMad: baselineCalc.sharedCostsPerPilgrim.flightCostMad.toNumber(),
      },
      visaExpense: {
        perPilgrimSar: baselineCalc.sharedCostsPerPilgrim.visaCostSar.toNumber(),
        perPilgrimMad: baselineCalc.sharedCostsPerPilgrim.visaCostMad.toNumber(),
        isHistoricalSnapshot: true,
      },
      groupBusExpense: {
        totalCostSar: Number(offer.trip.groupBusCostSar),
        pilgrimCount: offer.trip.expectedPilgrims,
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
          Number(offer.trip.sarToMadRate),
        isIncluded: t.isIncludedInPackage,
      })),
      trainExpenses: offer.trainExpenses.map((tr) => ({
        departureStation: tr.departureStation,
        arrivalStation: tr.arrivalStation,
        ticketClass: tr.ticketClass,
        ticketPriceSar: Number(tr.ticketPriceSar),
        passengerCount: tr.passengerCount,
        perPilgrimMad: Number(tr.ticketPriceSar) * Number(offer.trip.sarToMadRate),
        isIncluded: tr.isIncluded,
      })),
      additionalServices: offer.services.map((s) => ({
        serviceName: s.serviceName,
        amount: Number(s.costAmount),
        currency: s.currency,
        perPilgrimMad: Number(s.costAmount) * (s.currency === "SAR" ? Number(offer.trip.sarToMadRate) : 1),
      })),
      roomPricingSummary: {
        baseActualCostMad: roomBreakdown.totalActualCostMad.toNumber(),
        supplierCostAdditionsMad: 0,
        supplierCostReductionsMad: 0,
        netSupplierCostDeltaMad: 0,
        newActualCostMad: roomBreakdown.totalActualCostMad.toNumber(),
        configuredProfitMad: roomBreakdown.configuredProfitMad.toNumber(),
        isProfitOverridden: false,
        commercialDiscountMad: roomBreakdown.discountMad.toNumber(),
        finalSellingPriceMad: roomBreakdown.finalSellingPriceMad.toNumber(),
        realizedProfitMad: roomBreakdown.effectiveProfitMad.toNumber(),
      },
      multiRoomBreakdowns: baselineCalc.roomBreakdowns,
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
          "Content-Disposition": `inline; filename="Mathaba-Internal-Report-${offer.name.replace(/\s+/g, "-")}.pdf"`,
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
    console.error("Error generating internal report:", error);
    return NextResponse.json({ error: "Failed to generate internal report" }, { status: 500, headers: DOCUMENT_NO_CACHE_HEADERS });
  }
}
