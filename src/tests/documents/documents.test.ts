import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  calculateBaselineOffer,
  calculateIndividualQuote,
} from "../../core/finance/calculator";
import {
  projectCustomerFacingQuotation,
  verifyQuotationPrivacy,
  buildInternalFinancialReportData,
} from "../../core/finance/projection";
import {
  renderCustomerQuotationHtml,
} from "../../core/documents/customer-quotation-template";
import {
  renderInternalFinancialReportHtml,
} from "../../core/documents/internal-report-template";
import {
  ExchangeRates,
  BaselineOfferCalculationInput,
} from "../../core/finance/types";

describe("Mathaba Umrah Manager — Document, Privacy & Bilingual Engine", () => {
  const standardRates: ExchangeRates = {
    sarToMad: "2.70",
    eurToMad: "10.85",
  };

  const sampleAgency = {
    name: "وكالة مَثابة لأسفار العمرة",
    email: "contact@mathaba-umrah.com",
    phone: "+212 522 123 456",
    address: "شارع الحسن الثاني، الدار البيضاء، المغرب",
    documentFooterText: "وكالة مَثابة مرخصة من وزارة السياحة والحج والعمرة. جميع الأسعار نهائية بالدرهم المغربي.",
    quotationTerms: "العرض صالح لمدة 10 أيام. لا يُعد هذا المستند فاتورة ضريبية وإنما هو عرض سعر مبدئي.",
  };

  const offerInput: BaselineOfferCalculationInput = {
    offerName: "باقة النور الاقتصادية",
    exchangeRates: standardRates,
    hotelStays: [
      {
        hotelName: "فندق أنوار الضيافة مكة",
        city: "MAKKAH",
        checkInDate: "2026-12-15",
        checkOutDate: "2026-12-20", // 5 nights
        singleDoubleNightlyRateSar: 500,
        tripleNightlyRateSar: 600,
        quadNightlyRateSar: 700,
      },
      {
        hotelName: "فندق دار التقوى المدينة",
        city: "MADINAH",
        checkInDate: "2026-12-20",
        checkOutDate: "2026-12-25", // 5 nights
        singleDoubleNightlyRateSar: 450,
        tripleNightlyRateSar: 540,
        quadNightlyRateSar: 640,
      },
    ],
    flight: {
      amount: 7500,
      currency: "MAD",
      allocation: "PER_PERSON",
    },
    transportation: {
      groupBusTotalSar: 4400,
      groupPilgrimCount: 40, // 110 SAR per pilgrim
    },
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
  };

  const offerResult = calculateBaselineOffer(offerInput);

  describe("PART 1: Customer Quotation Privacy Protection & Filtering", () => {
    it("generates a clean Arabic CustomerFacingQuotation without leaking internal supplier data", () => {
      const quotation = projectCustomerFacingQuotation({
        referenceNumber: "QT-2026-0001",
        issueDate: "2026-11-04",
        agencyName: sampleAgency.name,
        agencyPhone: sampleAgency.phone,
        agencyEmail: sampleAgency.email,
        agencyAddress: sampleAgency.address,
        documentFooterText: sampleAgency.documentFooterText,
        tripName: "رحلة عمرة رجب 1448",
        tripStartDate: "2026-12-15",
        tripEndDate: "2026-12-25",
        offerResult,
        selectedRoomCategory: "DOUBLE",
        documentLanguage: "ar",
        includedServices: [
          "تأشيرة العمرة والتأمين الطبي الشامل",
          "تذاكر الطيران المباشر ذهاباً وإياباً",
          "النقل بالحافلات الحديثة والمكيفة",
          "تذاكر قطار الحرمين السريع بين مكة والمدينة",
        ],
        termsAndConditions: [sampleAgency.quotationTerms],
      });

      expect(quotation.agencyName).toBe("وكالة مَثابة لأسفار العمرة");
      expect(quotation.roomCategory).toBe("DOUBLE");
      expect(quotation.finalSellingPriceMad).toBeGreaterThan(0);
      expect(quotation.currency).toBe("MAD");
      expect(quotation.hotelStays).toHaveLength(2);
      expect(quotation.documentLanguage).toBe("ar");

      // Deep privacy audit: 0 leaked fields
      const audit = verifyQuotationPrivacy(quotation as unknown as Record<string, unknown>);
      expect(audit.isSafe).toBe(true);
      expect(audit.leakedFields).toEqual([]);

      // Explicit string inspection on raw serialized quotation
      const rawJson = JSON.stringify(quotation);
      expect(rawJson).not.toContain("profit");
      expect(rawJson).not.toContain("margin");
      expect(rawJson).not.toContain("supplier");
      expect(rawJson).not.toContain("discount");
    });

    it("generates a clean French CustomerFacingQuotation with French terms and zero leaked data", () => {
      const quotation = projectCustomerFacingQuotation({
        referenceNumber: "QT-FR-0001",
        issueDate: "2026-11-04",
        agencyName: sampleAgency.name,
        tripName: "Omra Rajab 1448",
        tripStartDate: "2026-12-15",
        tripEndDate: "2026-12-25",
        offerResult,
        selectedRoomCategory: "DOUBLE",
        documentLanguage: "fr",
      });

      expect(quotation.documentLanguage).toBe("fr");
      expect(quotation.termsAndConditions.some((t) => t.includes("valable"))).toBe(true);
      expect(quotation.includedServices).toContain("Visa électronique Omra et assurance médicale complète");

      const audit = verifyQuotationPrivacy(quotation as unknown as Record<string, unknown>);
      expect(audit.isSafe).toBe(true);
      expect(audit.leakedFields).toEqual([]);

      const rawJson = JSON.stringify(quotation);
      expect(rawJson).not.toContain("profit");
      expect(rawJson).not.toContain("margin");
      expect(rawJson).not.toContain("supplier");
      expect(rawJson).not.toContain("discount");
    });

    it("verifyQuotationPrivacy detects forbidden keys when injected", () => {
      const quotation = projectCustomerFacingQuotation({
        agencyName: sampleAgency.name,
        tripName: "رحلة تجريبية",
        offerResult,
        selectedRoomCategory: "DOUBLE",
      });

      const contaminated = {
        ...quotation,
        supplierCostMad: 15000,
        profitMarginMad: 2000,
      };

      const audit = verifyQuotationPrivacy(contaminated as unknown as Record<string, unknown>);
      expect(audit.isSafe).toBe(false);
      expect(audit.leakedFields).toContain("supplierCostMad");
      expect(audit.leakedFields).toContain("profitMarginMad");
    });

    it("generates a customized individual quotation for a pilgrim preserving privacy", () => {
      const customizedCalc = calculateIndividualQuote("الحاج محمد العلمي", {
        baselineBreakdown: offerResult.roomBreakdowns.DOUBLE,
        commercialDiscountMad: 500,
        customizationItems: [
          {
            type: "ADD_PRIVATE_TRANSPORT",
            description: "سيارة خاصة GMC من مطار جدة لمكة",
            supplierCostDeltaMad: 540,
            sellingPriceDeltaMad: 540,
          },
        ],
      });

      expect(customizedCalc.supplierCostMad.toNumber()).toBe(16302);
      expect(customizedCalc.supplierCostAdditionsMad.toNumber()).toBe(540);
      expect(customizedCalc.totalEffectiveCostMad.toNumber()).toBe(16842);
      expect(customizedCalc.finalSellingPriceMad.toNumber()).toBe(18342);
      expect(customizedCalc.netProfitMad.toNumber()).toBe(1500);

      const quoteQuotation = projectCustomerFacingQuotation({
        referenceNumber: "QT-IND-001",
        agencyName: sampleAgency.name,
        tripName: "رحلة عمرة رجب",
        offerResult,
        selectedRoomCategory: "DOUBLE",
        pilgrimQuote: customizedCalc,
        pilgrimName: "الحاج محمد العلمي",
        isIndividualQuote: true,
        customizationDescriptions: ["سيارة خاصة GMC من مطار جدة لمكة"],
      });

      expect(quoteQuotation.isIndividualQuote).toBe(true);
      expect(quoteQuotation.pilgrimName).toBe("الحاج محمد العلمي");
      expect(quoteQuotation.finalSellingPriceMad).toBe(18342);
      expect(quoteQuotation.customizationDescriptions).toContain("سيارة خاصة GMC من مطار جدة لمكة");

      const audit = verifyQuotationPrivacy(quoteQuotation as unknown as Record<string, unknown>);
      expect(audit.isSafe).toBe(true);
      expect(audit.leakedFields).toEqual([]);
    });
  });

  describe("PART 2: Bilingual Customer Quotation HTML Rendering", () => {
    it("renders Arabic customer quotation with RTL, Cairo font, and Moroccan Dirham", () => {
      const quotation = projectCustomerFacingQuotation({
        referenceNumber: "QT-HTML-AR-001",
        issueDate: "2026-11-04",
        agencyName: sampleAgency.name,
        agencyPhone: sampleAgency.phone,
        agencyEmail: sampleAgency.email,
        agencyAddress: sampleAgency.address,
        documentFooterText: sampleAgency.documentFooterText,
        tripName: "رحلة النور",
        tripStartDate: "2026-12-15",
        tripEndDate: "2026-12-25",
        offerResult,
        selectedRoomCategory: "DOUBLE",
        documentLanguage: "ar",
        pilgrimName: "عبد الله التازي",
        isIndividualQuote: true,
        customizationDescriptions: ["ترقية سيارة خاصة GMC (مشاركة 3 معتمرين)"],
        termsAndConditions: [sampleAgency.quotationTerms],
      });

      const html = renderCustomerQuotationHtml(quotation);
      expect(html).toContain("dir=\"rtl\"");
      expect(html).toContain("Cairo");
      expect(html).toContain("عرض سعر رحلة العمرة");
      expect(html).toContain("عبد الله التازي");
      expect(html).toContain("درهم");
      expect(html).toContain(sampleAgency.name);
      expect(html).toContain(sampleAgency.documentFooterText);
      expect(html).toContain(sampleAgency.quotationTerms);

      // Verify HTML does NOT contain internal supplier data
      expect(html).not.toMatch(/سعر المورد/);
      expect(html).not.toMatch(/هامش الربح/);
      expect(html).not.toMatch(/التكلفة الفعلية/);
    });

    it("renders French customer quotation with LTR, Inter font, 'Devis Omra', and MAD", () => {
      const quotation = projectCustomerFacingQuotation({
        referenceNumber: "QT-HTML-FR-001",
        issueDate: "2026-11-04",
        agencyName: sampleAgency.name,
        agencyPhone: sampleAgency.phone,
        agencyEmail: sampleAgency.email,
        tripName: "Voyage Omra Rajab 1448",
        tripStartDate: "2026-12-15",
        tripEndDate: "2026-12-25",
        offerResult,
        selectedRoomCategory: "DOUBLE",
        documentLanguage: "fr",
        pilgrimName: "M. Abdellah Tazi",
        isIndividualQuote: true,
      });

      const html = renderCustomerQuotationHtml(quotation);
      expect(html).toContain("dir=\"ltr\"");
      expect(html).toContain("Inter");
      expect(html).toContain("Devis Omra");
      expect(html).toContain("Chambre double (2 pèlerins)");
      expect(html).toContain("M. Abdellah Tazi");
      expect(html).toContain("MAD");
      expect(html).toContain("Prestations et Services Inclus");
      expect(html).toContain("Conditions Générales");

      // Verify absolute privacy in French: zero supplier costs or margins
      expect(html).not.toMatch(/coût fournisseur/i);
      expect(html).not.toMatch(/marge/i);
      expect(html).not.toMatch(/bénéfice/i);
    });
  });

  describe("PART 3: Internal Cost Statement & Margin Inclusion Toggle", () => {
    const baseReportParams = {
      reportReference: "MTH-AUDIT-2026-0001",
      generationDate: "2026-11-04",
      isDraft: false,
      agencyName: sampleAgency.name,
      tripName: "رحلة عمرة رجب 1448",
      tripDates: {
        start: "2026-12-15",
        end: "2026-12-25",
        nightsCount: 10,
      },
      expectedPilgrims: 40,
      exchangeRates: {
        sarToMad: 2.70,
        eurToMad: 10.85,
      },
      offerName: "باقة النور الاقتصادية",
      roomCategory: "DOUBLE" as const,
      hotelStaysBreakdown: [
        {
          hotelName: "فندق أنوار الضيافة مكة",
          city: "MAKKAH",
          checkInDate: "2026-12-15",
          checkOutDate: "2026-12-20",
          nights: 5,
          isOverridden: false,
          singleDoubleRateSar: 500,
          tripleRateSar: 600,
          quadRateSar: 700,
          fullRoomTotalSar: 2500,
          perPersonSar: 1250,
          perPersonMad: 3375,
        },
        {
          hotelName: "فندق دار التقوى المدينة",
          city: "MADINAH",
          checkInDate: "2026-12-20",
          checkOutDate: "2026-12-25",
          nights: 5,
          isOverridden: false,
          singleDoubleRateSar: 450,
          tripleRateSar: 540,
          quadRateSar: 640,
          fullRoomTotalSar: 2250,
          perPersonSar: 1125,
          perPersonMad: 3037.5,
        },
      ],
      flightExpense: {
        amount: 7500,
        currency: "MAD",
        allocationType: "PER_PERSON",
        perPilgrimMad: 7500,
      },
      visaExpense: {
        perPilgrimSar: 525,
        perPilgrimMad: 1417.5,
        isHistoricalSnapshot: true,
      },
      groupBusExpense: {
        totalCostSar: 4400,
        pilgrimCount: 40,
        perPilgrimSar: 110,
        perPilgrimMad: 297,
        isMaintained: true,
      },
      additionalTransports: [],
      trainExpenses: [
        {
          departureStation: "محطة مكة المكرمة",
          arrivalStation: "محطة المدينة المنورة",
          ticketClass: "ECONOMY",
          ticketPriceSar: 250,
          passengerCount: 40,
          perPilgrimMad: 675,
          isIncluded: true,
        },
      ],
      roomPricingSummary: {
        baseActualCostMad: 16302,
        supplierCostAdditionsMad: 0,
        supplierCostReductionsMad: 0,
        netSupplierCostDeltaMad: 0,
        newActualCostMad: 16302,
        configuredProfitMad: 2000,
        isProfitOverridden: false,
        commercialDiscountMad: 0,
        finalSellingPriceMad: 18302,
        realizedProfitMad: 2000,
      },
    };

    it("generates Arabic shareable Cost Statement with margins HIDDEN by default", () => {
      const report = buildInternalFinancialReportData({
        ...baseReportParams,
        documentLanguage: "ar",
        includeMargins: false, // Default shareable mode
      });

      expect(report.includeMargins).toBe(false);
      expect(report.documentLanguage).toBe("ar");

      const html = renderInternalFinancialReportHtml(report);
      expect(html).toContain("dir=\"rtl\"");
      expect(html).toContain("بيان التكلفة (Internal Cost Statement)");
      expect(html).toContain("بيان تكلفة معتمد");
      expect(html).toContain("فندق أنوار الضيافة مكة");
      expect(html).toContain("إجمالي التكلفة الفعلية للموردين");
      expect(html).toContain("16,302.00");

      // Verify that profit margins and selling prices are HIDDEN
      expect(html).not.toContain("هامش الربح المحدد");
      expect(html).not.toContain("سعر البيع النهائي الصافي");
      expect(html).toContain("تفاصيل وهوامش الأرباح مخفية تلقائياً");
    });

    it("generates Arabic Cost Statement with margins INCLUDED when requested", () => {
      const report = buildInternalFinancialReportData({
        ...baseReportParams,
        documentLanguage: "ar",
        includeMargins: true, // Internal management mode
      });

      expect(report.includeMargins).toBe(true);

      const html = renderInternalFinancialReportHtml(report);
      expect(html).toContain("بيان التكلفة والتدقيق المالي الداخلي");
      expect(html).toContain("سري للغاية");
      expect(html).toContain("التكلفة الفعلية للموردين");
      expect(html).toContain("هامش الربح المحدد");
      expect(html).toContain("سعر البيع النهائي الصافي");
      expect(html).toContain("الربح المتبقي");
      expect(html).toContain("18,302.00");
      expect(html).toContain("2,000.00");
    });

    it("generates French shareable Cost Statement with margins HIDDEN", () => {
      const report = buildInternalFinancialReportData({
        ...baseReportParams,
        documentLanguage: "fr",
        includeMargins: false,
      });

      const html = renderInternalFinancialReportHtml(report);
      expect(html).toContain("dir=\"ltr\"");
      expect(html).toContain("État Détaillé des Coûts (Internal Cost Statement)");
      expect(html).toContain("Document Financier Agréé");
      expect(html).toContain("Total Coût Réel Fournisseur");
      expect(html).toContain("16 302,00"); // French formatted

      // Profit details hidden
      expect(html).not.toContain("Marge bénéficiaire cible");
      expect(html).not.toContain("Prix de vente final net");
      expect(html).not.toContain("Bénéfice net");
      expect(html).toContain("partenaires autorisés");
    });

    it("generates French Cost Statement with margins INCLUDED for internal audit", () => {
      const report = buildInternalFinancialReportData({
        ...baseReportParams,
        documentLanguage: "fr",
        includeMargins: true,
      });

      const html = renderInternalFinancialReportHtml(report);
      expect(html).toContain("dir=\"ltr\"");
      expect(html).toContain("État Détaillé des Coûts");
      expect(html).toContain("Audit Financier Interne");
      expect(html).toContain("Strictement Confidentiel");
      expect(html).toContain("Coût réel fournisseur");
      expect(html).toContain("Marge bénéficiaire cible");
      expect(html).toContain("Prix de vente final net");
      expect(html).toContain("Bénéfice net");
      expect(html).toContain("18 302,00");
      expect(html).toContain("2 000,00");
    });

    it("flags deficit warning when selling price is below actual supplier cost", () => {
      const deficitReport = buildInternalFinancialReportData({
        reportReference: "MTH-DEFICIT-01",
        generationDate: "2026-11-04",
        isDraft: true,
        includeMargins: true,
        agencyName: sampleAgency.name,
        tripName: "رحلة عجز",
        tripDates: { start: "2026-12-01", end: "2026-12-10", nightsCount: 9 },
        expectedPilgrims: 40,
        exchangeRates: { sarToMad: 2.70, eurToMad: 10.85 },
        offerName: "باقة عجز",
        pilgrimName: "محمد المنصوري",
        isIndividualQuote: true,
        roomCategory: "DOUBLE",
        hotelStaysBreakdown: [],
        flightExpense: { amount: 7500, currency: "MAD", allocationType: "PER_PERSON", perPilgrimMad: 7500 },
        visaExpense: { perPilgrimSar: 525, perPilgrimMad: 1417.5, isHistoricalSnapshot: true },
        groupBusExpense: { totalCostSar: 4400, pilgrimCount: 40, perPilgrimSar: 110, perPilgrimMad: 297, isMaintained: true },
        roomPricingSummary: {
          baseActualCostMad: 15000,
          supplierCostAdditionsMad: 0,
          supplierCostReductionsMad: 0,
          netSupplierCostDeltaMad: 0,
          newActualCostMad: 15000,
          configuredProfitMad: 2000,
          isProfitOverridden: false,
          commercialDiscountMad: 3000,
          finalSellingPriceMad: 14000, // 1,000 MAD deficit!
          realizedProfitMad: -1000,
        },
      });

      expect(deficitReport.isDeficit).toBe(true);
      expect(deficitReport.deficitAmountMad).toBe(1000);

      // Verify HTML template renders deficit alert banner
      const html = renderInternalFinancialReportHtml(deficitReport);
      expect(html).toContain("تنبيه عجز مالي");
      expect(html).toContain("1,000.00");
    });
  });
});
