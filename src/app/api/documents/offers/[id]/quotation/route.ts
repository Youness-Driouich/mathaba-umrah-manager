import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeOfferCalculation } from "@/core/finance/offer-helper";
import { projectCustomerFacingQuotation, verifyQuotationPrivacy } from "@/core/finance/projection";
import { renderCustomerQuotationHtml } from "@/core/documents/customer-quotation-template";
import { generatePdfFromHtml } from "@/core/documents/pdf-generator";
import { RoomCategoryType } from "@/core/finance/types";
import { DOCUMENT_NO_CACHE_HEADERS } from "@/core/documents/headers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const requestedCategory = (searchParams.get("roomCategory") || "DOUBLE") as RoomCategoryType;
    const lang = (searchParams.get("lang") || searchParams.get("language") || "ar") as "ar" | "fr";

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
      return NextResponse.json({ error: "Offer not found" }, { status: 404, headers: DOCUMENT_NO_CACHE_HEADERS });
    }

    const settings = await prisma.globalSetting.findFirst();
    const baselineCalc = computeOfferCalculation(offer);

    const transportServices = [
      {
        routeName: "حافلة المجموعة الحديثة والمكيفة",
        isPrivate: false,
        description: `تنقلات جماعية متكاملة ومريحة لفوج يضم ${offer.trip.expectedPilgrims} معتمراً`,
      },
      ...offer.additionalTransports
        .filter((t) => t.isIncludedInPackage)
        .map((t) => ({
          routeName: t.routeName,
          vehicleType: t.vehicleType,
          isPrivate: t.vehicleType !== "BUS",
          description: `نقل سياحي بمركبة ${t.vehicleType} مشمول بالباقة`,
        })),
    ];

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
      referenceNumber: `MTH-OF-${offer.id.substring(0, 6).toUpperCase()}`,
      issueDate: new Date().toISOString().split("T")[0],
      agencyName: settings?.agencyName || (lang === "fr" ? "Agence Mathaba Voyages" : "وكالة مَثابة لأسفار العمرة"),
      agencyPhone: settings?.agencyPhone,
      agencyEmail: settings?.agencyEmail,
      agencyAddress: settings?.agencyAddress,
      documentFooterText: settings?.documentFooterText,
      tripName: offer.trip.name,
      tripStartDate: new Date(offer.trip.startDate).toISOString().split("T")[0],
      tripEndDate: new Date(offer.trip.endDate).toISOString().split("T")[0],
      offerResult: baselineCalc,
      selectedRoomCategory: requestedCategory,
      isIndividualQuote: false,
      isDraft: !offer.isActive,
      flightDetails: {
        airlineName: offer.trip.airlineName || undefined,
        flightIncluded: Number(offer.trip.flightCost) > 0,
        description: offer.trip.airlineName
          ? (lang === "fr" ? `Vol aller-retour direct sur ${offer.trip.airlineName}` : `طيران دولي مباشر على متن ${offer.trip.airlineName}`)
          : (lang === "fr" ? "Billet d'avion international inclus" : "تذكرة طيران دولية مشمولة"),
      },
      transportServices,
      trainJourneys,
      termsAndConditions: settings?.quotationTerms
        ? settings.quotationTerms.split("\n").filter((l) => l.trim().length > 0)
        : undefined,
    });

    // Security check: verify zero confidential leaks
    const privacyAudit = verifyQuotationPrivacy(quotation as unknown as Record<string, unknown>);
    if (!privacyAudit.isSafe) {
      console.error("Privacy leak in customer quotation:", privacyAudit.leakedFields);
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
            "Content-Disposition": `inline; filename="Mathaba-Quotation-${offer.name.replace(/\s+/g, "-")}.pdf"`,
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
    console.error("Error generating offer quotation:", error);
    return NextResponse.json({ error: "Failed to generate quotation" }, { status: 500, headers: DOCUMENT_NO_CACHE_HEADERS });
  }
}
