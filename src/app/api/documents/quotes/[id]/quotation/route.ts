import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeOfferCalculation } from "@/core/finance/offer-helper";
import { calculateIndividualQuote } from "@/core/finance/calculator";
import { projectCustomerFacingQuotation, verifyQuotationPrivacy } from "@/core/finance/projection";
import { renderCustomerQuotationHtml } from "@/core/documents/customer-quotation-template";
import { generatePdfFromHtml } from "@/core/documents/pdf-generator";
import { QuoteStatus, CustomizationType } from "@prisma/client";
import { DOCUMENT_NO_CACHE_HEADERS } from "@/core/documents/headers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const lang = (searchParams.get("lang") || searchParams.get("language") || "ar") as "ar" | "fr";

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
      return NextResponse.json({ error: "Quote not found" }, { status: 404, headers: DOCUMENT_NO_CACHE_HEADERS });
    }

    const { offer } = quote;
    const { trip } = offer;
    const settings = await prisma.globalSetting.findFirst();

    // Use snapshot if available, or compute baseline from offer
    const snapshot = quote.snapshotData as any;
    let baselineBreakdown: any = null;

    if (snapshot?.roomBreakdowns?.[quote.roomCategory]) {
      baselineBreakdown = snapshot.roomBreakdowns[quote.roomCategory];
    } else {
      const baselineCalc = computeOfferCalculation(offer);
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

    // Customer-friendly customization descriptions
    const customizationDescriptions: string[] = [];
    const transportServices: Array<{
      routeName: string;
      vehicleType?: string;
      isPrivate?: boolean;
      description: string;
    }> = [
      {
        routeName: "حافلة المجموعة الحديثة والمكيفة",
        isPrivate: false,
        description: "تنقلات جماعية متكاملة ومريحة للمزارات والمطارات",
      },
    ];

    for (const c of quote.customizations) {
      if (c.type === CustomizationType.ADD_PRIVATE_TRANSPORT) {
        const details = c.details as any;
        const vType = details?.vehicleType || "GMC";
        const route = details?.routeName || "تنقلات خاصة";
        transportServices.push({
          routeName: route,
          vehicleType: vType,
          isPrivate: true,
          description: `نقل خاص مريح بمركبة ${vType} عائلية فاخرة مخصصة`,
        });
        customizationDescriptions.push(`نقل خاص VIP (${vType}) مخصص للمعتمر`);
      } else if (c.type === CustomizationType.ADD_SERVICE || c.type === CustomizationType.ADDON) {
        customizationDescriptions.push(c.description);
      } else if (c.type === CustomizationType.REPLACE_SERVICE) {
        customizationDescriptions.push(`ترقية خاصة: ${c.description}`);
      }
    }

    const trainJourneys = offer.trainExpenses
      .filter((tr) => tr.isIncluded)
      .map((tr) => ({
        departureStation: tr.departureStation,
        arrivalStation: tr.arrivalStation,
        ticketClass: tr.ticketClass as "ECONOMY" | "BUSINESS",
        travelDate: tr.travelDate ? new Date(tr.travelDate).toISOString().split("T")[0] : undefined,
      }));

    const quotation = projectCustomerFacingQuotation({
      documentLanguage: lang,
      referenceNumber: `MTH-Q-${quote.id.substring(0, 6).toUpperCase()}`,
      issueDate: new Date(quote.createdAt).toISOString().split("T")[0],
      agencyName: settings?.agencyName || (lang === "fr" ? "Agence Mathaba Voyages" : "وكالة مَثابة لأسفار العمرة"),
      agencyPhone: settings?.agencyPhone,
      agencyEmail: settings?.agencyEmail,
      agencyAddress: settings?.agencyAddress,
      documentFooterText: settings?.documentFooterText,
      tripName: trip.name,
      tripStartDate: new Date(trip.startDate).toISOString().split("T")[0],
      tripEndDate: new Date(trip.endDate).toISOString().split("T")[0],
      offerResult: {
        offerName: offer.name,
        hotelStays: offer.hotelStays.map((s) => ({
          hotelName: s.hotelName,
          city: s.city as "MAKKAH" | "MADINAH",
          nightsCount: s.nightsCount,
          isOverridden: s.isNightsOverridden,
          fullRoomTotalCostSar: {} as any,
          perPersonCostSar: {} as any,
          perPersonCostMad: {} as any,
        })),
        sharedCostsPerPilgrim: {} as any,
        roomBreakdowns: {} as any,
      },
      selectedRoomCategory: quote.roomCategory,
      pilgrimQuote: calcResult,
      pilgrimName: quote.pilgrimName,
      contactPhone: quote.contactPhone,
      isIndividualQuote: true,
      isDraft: quote.status === QuoteStatus.DRAFT,
      flightDetails: {
        airlineName: trip.airlineName || undefined,
        flightIncluded: Number(trip.flightCost) > 0,
        description: trip.airlineName
          ? (lang === "fr" ? `Vol direct avec ${trip.airlineName}` : `طيران دولي مباشر على متن ${trip.airlineName}`)
          : (lang === "fr" ? "Billet d'avion international inclus" : "تذكرة طيران دولية مشمولة"),
      },
      transportServices,
      trainJourneys,
      customizationDescriptions,
      termsAndConditions: settings?.quotationTerms
        ? settings.quotationTerms.split("\n").filter((l) => l.trim().length > 0)
        : undefined,
    });

    // Security check: verify zero confidential leaks
    const privacyAudit = verifyQuotationPrivacy(quotation as unknown as Record<string, unknown>);
    if (!privacyAudit.isSafe) {
      console.error("Privacy leak in pilgrim customer quotation:", privacyAudit.leakedFields);
      return NextResponse.json({ error: "Confidentiality protection fault" }, { status: 500 });
    }

    if (format === "html") {
      const html = renderCustomerQuotationHtml(quotation, lang);
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...DOCUMENT_NO_CACHE_HEADERS,
        },
      });
    }

    if (format === "pdf") {
      const html = renderCustomerQuotationHtml(quotation, lang);
      try {
        const pdfBuffer = await generatePdfFromHtml(html);
        return new NextResponse(pdfBuffer as any, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="Mathaba-Quote-${quote.pilgrimName.replace(/\s+/g, "-")}.pdf"`,
            ...DOCUMENT_NO_CACHE_HEADERS,
          },
        });
      } catch (pdfErr) {
        console.warn("Serverless Chromium unavailable, falling back to printable HTML:", pdfErr);
        return new NextResponse(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Pdf-Fallback": "browser-print-required",
            ...DOCUMENT_NO_CACHE_HEADERS,
          },
        });
      }
    }

    return NextResponse.json({ quotation }, { headers: DOCUMENT_NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Error generating pilgrim quotation:", error);
    return NextResponse.json({ error: "Failed to generate quotation" }, { status: 500, headers: DOCUMENT_NO_CACHE_HEADERS });
  }
}
