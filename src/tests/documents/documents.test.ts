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

describe("Mathaba Umrah Manager — Phase 6 Document & Privacy Engine", () => {
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

  describe("STEP 1: Customer Quotation Privacy Protection & Filtering", () => {
    it("generates a clean CustomerFacingQuotation from an Offer without leaking internal supplier data", () => {
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

      // Base Double Cost = 16,302 MAD
      // GMC share = +540 MAD
      // New Actual Cost = 16,842 MAD
      // Configured Profit = 2,000 MAD
      // Commercial Discount = 500 MAD
      // Selling Price = 16,842 + 2,000 - 500 = 18,342 MAD
      // Realized Profit = 18,342 - 16,842 = 1,500 MAD
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

  describe("STEP 2: Internal Financial Report Generation", () => {
    it("builds a comprehensive internal financial report with full supplier breakdowns and profit audit", () => {
      const report = buildInternalFinancialReportData({
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
        roomCategory: "DOUBLE",
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
      });

      expect(report.isConfidential).toBe(true);
      expect(report.isDeficit).toBe(false);
      expect(report.deficitAmountMad).toBe(0);
      expect(report.hotelStaysBreakdown).toHaveLength(2);
      expect(report.hotelStaysBreakdown[0].singleDoubleRateSar).toBe(500);
      expect(report.groupBusExpense.isMaintained).toBe(true);
      expect(report.roomPricingSummary.realizedProfitMad).toBe(2000);
    });

    it("flags deficit warning when selling price is below actual supplier cost", () => {
      const deficitReport = buildInternalFinancialReportData({
        reportReference: "MTH-DEFICIT-01",
        generationDate: "2026-11-04",
        isDraft: true,
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
      expect(html).toContain(deficitReport.deficitAmountMad.toLocaleString());
    });
  });

  describe("STEP 3: HTML Template Generation & Rendering Integrity", () => {
    it("generates customer quotation HTML with Cairo font, RTL direction, and valid price formatting", () => {
      const quotation = projectCustomerFacingQuotation({
        referenceNumber: "QT-HTML-001",
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
        pilgrimName: "عبد الله التازي",
        isIndividualQuote: true,
        customizationDescriptions: ["ترقية سيارة خاصة GMC (مشاركة 3 معتمرين)"],
        termsAndConditions: [sampleAgency.quotationTerms],
      });

      const html = renderCustomerQuotationHtml(quotation);
      expect(html).toContain("dir=\"rtl\"");
      expect(html).toContain("Cairo");
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

    it("generates internal financial report HTML with comprehensive breakdown and confidential notices", () => {
      const report = buildInternalFinancialReportData({
        reportReference: "MTH-AUDIT-HTML-001",
        generationDate: "2026-11-04",
        isDraft: false,
        agencyName: sampleAgency.name,
        tripName: "رحلة النور",
        tripDates: { start: "2026-12-15", end: "2026-12-25", nightsCount: 10 },
        expectedPilgrims: 40,
        exchangeRates: { sarToMad: 2.70, eurToMad: 10.85 },
        offerName: "باقة النور",
        roomCategory: "DOUBLE",
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
        ],
        flightExpense: { amount: 7500, currency: "MAD", allocationType: "PER_PERSON", perPilgrimMad: 7500 },
        visaExpense: { perPilgrimSar: 525, perPilgrimMad: 1417.5, isHistoricalSnapshot: true },
        groupBusExpense: { totalCostSar: 4400, pilgrimCount: 40, perPilgrimSar: 110, perPilgrimMad: 297, isMaintained: true },
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
      });

      const html = renderInternalFinancialReportHtml(report);
      expect(html).toContain("dir=\"rtl\"");
      expect(html).toContain("تقرير التدقيق المالي الداخلي");
      expect(html).toContain("سري للغاية");
      expect(html).toContain("فندق أنوار الضيافة مكة");
      expect(html).toContain("500"); // Nightly rate in SAR
      expect(html).toContain("2 000"); // Realized profit formatted
    });
  });
});
