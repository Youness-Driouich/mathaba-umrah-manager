import { PrismaClient } from "@prisma/client";
import { calculateBaselineOffer, calculateIndividualQuote } from "../src/core/finance/calculator";
import { projectCustomerFacingQuotation, buildInternalFinancialReportData, verifyQuotationPrivacy } from "../src/core/finance/projection";
import { renderCustomerQuotationHtml } from "../src/core/documents/customer-quotation-template";
import { renderInternalFinancialReportHtml } from "../src/core/documents/internal-report-template";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Mathaba Umrah Manager — Bilingual Document Verification ===");

  // Fetch agency settings & trips from real Neon database (read-only)
  const settings = await prisma.globalSetting.findFirst();
  console.log(`Agency Name: ${settings?.agencyName || "وكالة مَثابة"}`);
  console.log(`Default Visa: ${settings?.defaultVisaFeeSar} SAR`);

  const trip = await prisma.umrahTrip.findFirst({
    include: {
      offers: {
        include: {
          hotelStays: true,
          additionalTransports: true,
          trainExpenses: true,
          individualQuotes: {
            include: { customizations: true }
          }
        }
      }
    }
  });

  if (!trip || trip.offers.length === 0) {
    console.log("No trips/offers found in Neon. Generating mock verification data.");
  } else {
    console.log(`Found Trip in Neon: ${trip.name} (${trip.offers.length} offers)`);
    const offer = trip.offers[0];
    console.log(`Offer 1: ${offer.name}`);
    console.log(`Quotes count: ${offer.individualQuotes.length}`);
  }

  // Build standard verified test case
  const rates = { sarToMad: "2.70", eurToMad: "10.85" };
  const baselineOffer = calculateBaselineOffer({
    offerName: "باقة النور الاقتصادية 1448",
    exchangeRates: rates,
    hotelStays: [
      {
        hotelName: "فندق أنوار الضيافة مكة",
        city: "MAKKAH",
        checkInDate: "2026-12-15",
        checkOutDate: "2026-12-20",
        singleDoubleNightlyRateSar: 500,
        tripleNightlyRateSar: 600,
        quadNightlyRateSar: 700,
      },
      {
        hotelName: "فندق دار التقوى المدينة",
        city: "MADINAH",
        checkInDate: "2026-12-20",
        checkOutDate: "2026-12-25",
        singleDoubleNightlyRateSar: 450,
        tripleNightlyRateSar: 540,
        quadNightlyRateSar: 640,
      },
    ],
    flight: { amount: 7500, currency: "MAD", allocation: "PER_PERSON" },
    transportation: { groupBusTotalSar: 4400, groupPilgrimCount: 40 },
    trainExpenses: [
      {
        departureStation: "مكة المكرمة",
        arrivalStation: "المدينة المنورة",
        ticketClass: "ECONOMY",
        ticketPriceSar: 250,
        passengerCount: 40,
        isIncluded: true,
      },
    ],
    visaCostSar: 525,
    fixedProfitMadPerPilgrim: 2000,
  });

  const customizedQuote = calculateIndividualQuote("الحاج محمد العلمي", {
    baselineBreakdown: baselineOffer.roomBreakdowns.DOUBLE,
    commercialDiscountMad: 300,
    customizationItems: [
      {
        type: "ADD_PRIVATE_TRANSPORT",
        description: "سيارة خاصة GMC من مطار جدة إلى فندق مكة (حصة المعتمر)",
        supplierCostDeltaMad: 540,
        sellingPriceDeltaMad: 540,
      },
    ],
  });

  console.log("\n--- Verification 1: Financial Calculations Integrity ---");
  console.log(`Base Actual Cost (Double): ${customizedQuote.supplierCostMad.toNumber()} MAD (Expected: 16302)`);
  console.log(`Supplier Additions: ${customizedQuote.supplierCostAdditionsMad.toNumber()} MAD (Expected: 540)`);
  console.log(`Total Effective Cost: ${customizedQuote.totalEffectiveCostMad.toNumber()} MAD (Expected: 16842)`);
  console.log(`Selling Price: ${customizedQuote.finalSellingPriceMad.toNumber()} MAD (Expected: 18542)`);
  console.log(`Realized Profit: ${customizedQuote.netProfitMad.toNumber()} MAD (Expected: 1700)`);

  if (
    customizedQuote.totalEffectiveCostMad.toNumber() !== 16842 ||
    customizedQuote.finalSellingPriceMad.toNumber() !== 18542 ||
    customizedQuote.netProfitMad.toNumber() !== 1700
  ) {
    throw new Error("Financial calculation mismatch!");
  }
  console.log("✔ Phase 6 Financial Calculation Exact Match Confirmed!");

  // Document 1: Customer Quotation - Arabic
  const quoteAr = projectCustomerFacingQuotation({
    referenceNumber: "QT-AR-2026-001",
    issueDate: "2026-11-04",
    agencyName: settings?.agencyName || "وكالة مَثابة لأسفار العمرة",
    agencyPhone: settings?.agencyPhone || "+212 522 123 456",
    agencyEmail: settings?.agencyEmail || "contact@mathaba.ma",
    agencyAddress: settings?.agencyAddress || "شارع الحسن الثاني، الدار البيضاء",
    documentFooterText: settings?.quotationFooterText || "وكالة معتمدة من وزارة السياحة",
    tripName: "رحلة رجب 1448",
    tripStartDate: "2026-12-15",
    tripEndDate: "2026-12-25",
    offerResult: baselineOffer,
    selectedRoomCategory: "DOUBLE",
    pilgrimQuote: customizedQuote,
    pilgrimName: "الحاج محمد العلمي",
    isIndividualQuote: true,
    documentLanguage: "ar",
    customizationDescriptions: ["سيارة خاصة GMC من مطار جدة إلى فندق مكة (حصة المعتمر)"],
  });

  const quoteArAudit = verifyQuotationPrivacy(quoteAr as unknown as Record<string, unknown>);
  console.log(`Arabic Customer Quotation Privacy Safe: ${quoteArAudit.isSafe}`);
  if (!quoteArAudit.isSafe) throw new Error("Arabic Quotation leaked private data!");

  const htmlQuoteAr = renderCustomerQuotationHtml(quoteAr);
  if (!htmlQuoteAr.includes("dir=\"rtl\"") || !htmlQuoteAr.includes("Cairo")) {
    throw new Error("Arabic Quotation styling invalid!");
  }
  console.log("✔ Arabic Customer Quotation HTML generated (RTL, Cairo font, privacy verified).");

  // Document 2: Customer Quotation - French
  const quoteFr = projectCustomerFacingQuotation({
    referenceNumber: "QT-FR-2026-001",
    issueDate: "2026-11-04",
    agencyName: settings?.agencyName || "Mathaba Voyages Omra",
    agencyPhone: settings?.agencyPhone || "+212 522 123 456",
    agencyEmail: settings?.agencyEmail || "contact@mathaba.ma",
    tripName: "Voyage Omra Rajab 1448",
    tripStartDate: "2026-12-15",
    tripEndDate: "2026-12-25",
    offerResult: baselineOffer,
    selectedRoomCategory: "DOUBLE",
    pilgrimQuote: customizedQuote,
    pilgrimName: "M. Mohamed El Alami",
    isIndividualQuote: true,
    documentLanguage: "fr",
    customizationDescriptions: ["Véhicule privé GMC depuis l'aéroport de Djeddah (part du pèlerin)"],
  });

  const quoteFrAudit = verifyQuotationPrivacy(quoteFr as unknown as Record<string, unknown>);
  console.log(`French Customer Quotation Privacy Safe: ${quoteFrAudit.isSafe}`);
  if (!quoteFrAudit.isSafe) throw new Error("French Quotation leaked private data!");

  const htmlQuoteFr = renderCustomerQuotationHtml(quoteFr);
  if (!htmlQuoteFr.includes("dir=\"ltr\"") || !htmlQuoteFr.includes("Inter") || !htmlQuoteFr.includes("Devis Omra")) {
    throw new Error("French Quotation styling invalid!");
  }
  console.log("✔ French Customer Quotation HTML generated (LTR, Inter font, Devis Omra, privacy verified).");

  // Document 3: Internal Cost Statement - Arabic (Without Margins - Shareable Default)
  const reportArShareable = buildInternalFinancialReportData({
    reportReference: "MTH-COST-AR-001",
    generationDate: "2026-11-04",
    isDraft: false,
    documentLanguage: "ar",
    includeMargins: false,
    agencyName: "وكالة مَثابة لأسفار العمرة",
    tripName: "رحلة رجب 1448",
    tripDates: { start: "2026-12-15", end: "2026-12-25", nightsCount: 10 },
    expectedPilgrims: 40,
    exchangeRates: { sarToMad: 2.70, eurToMad: 10.85 },
    offerName: "باقة النور الاقتصادية",
    roomCategory: "DOUBLE",
    hotelStaysBreakdown: [],
    flightExpense: { amount: 7500, currency: "MAD", allocationType: "PER_PERSON", perPilgrimMad: 7500 },
    visaExpense: { perPilgrimSar: 525, perPilgrimMad: 1417.5, isHistoricalSnapshot: true },
    groupBusExpense: { totalCostSar: 4400, pilgrimCount: 40, perPilgrimSar: 110, perPilgrimMad: 297, isMaintained: true },
    roomPricingSummary: {
      baseActualCostMad: 16302,
      supplierCostAdditionsMad: 540,
      supplierCostReductionsMad: 0,
      netSupplierCostDeltaMad: 540,
      newActualCostMad: 16842,
      configuredProfitMad: 2000,
      isProfitOverridden: false,
      commercialDiscountMad: 300,
      finalSellingPriceMad: 18542,
      realizedProfitMad: 1700,
    },
  });

  const htmlArShareable = renderInternalFinancialReportHtml(reportArShareable);
  if (
    !htmlArShareable.includes("بيان التكلفة (Internal Cost Statement)") ||
    htmlArShareable.includes("هامش الربح المحدد") ||
    htmlArShareable.includes("سعر البيع النهائي الصافي") ||
    !htmlArShareable.includes("16,842.00")
  ) {
    throw new Error("Arabic Shareable Cost Statement violated margin hiding rules!");
  }
  console.log("✔ Arabic Shareable Cost Statement verified (margins hidden, actual supplier costs only).");

  // Document 4: Internal Cost Statement - Arabic (With Margins - Management Audit)
  const reportArAudit = buildInternalFinancialReportData({
    ...reportArShareable,
    includeMargins: true,
  });

  const htmlArAudit = renderInternalFinancialReportHtml(reportArAudit);
  if (
    !htmlArAudit.includes("بيان التكلفة والتدقيق المالي الداخلي") ||
    !htmlArAudit.includes("18,542.00") ||
    !htmlArAudit.includes("1,700.00")
  ) {
    throw new Error("Arabic Audit Statement failed to render margin breakdown!");
  }
  console.log("✔ Arabic Internal Audit Statement verified (full margins, 18,542 selling price, 1,700 profit).");

  // Document 5: Internal Cost Statement - French (Without Margins - Shareable Default)
  const reportFrShareable = buildInternalFinancialReportData({
    ...reportArShareable,
    documentLanguage: "fr",
    includeMargins: false,
  });

  const htmlFrShareable = renderInternalFinancialReportHtml(reportFrShareable);
  if (
    !htmlFrShareable.includes("État Détaillé des Coûts (Internal Cost Statement)") ||
    htmlFrShareable.includes("Marge bénéficiaire cible") ||
    htmlFrShareable.includes("Prix de vente final net") ||
    !htmlFrShareable.includes("16 842,00")
  ) {
    throw new Error("French Shareable Cost Statement violated margin hiding rules!");
  }
  console.log("✔ French Shareable Cost Statement verified (margins hidden, 16 842 MAD actual supplier cost).");

  // Document 6: Internal Cost Statement - French (With Margins - Management Audit)
  const reportFrAudit = buildInternalFinancialReportData({
    ...reportArShareable,
    documentLanguage: "fr",
    includeMargins: true,
  });

  const htmlFrAudit = renderInternalFinancialReportHtml(reportFrAudit);
  if (
    !htmlFrAudit.includes("État Détaillé des Coûts") ||
    !htmlFrAudit.includes("Audit Financier Interne") ||
    !htmlFrAudit.includes("18 542,00") ||
    !htmlFrAudit.includes("1 700,00")
  ) {
    throw new Error("French Audit Statement failed to render margin breakdown!");
  }
  console.log("✔ French Internal Audit Statement verified (full margins, 18 542 MAD selling price, 1 700 MAD profit).");

  console.log("\n========================================================");
  console.log("ALL 6 DOCUMENT VARIANTS & FINANCIAL FORMULAS VERIFIED 100%");
  console.log("========================================================");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
