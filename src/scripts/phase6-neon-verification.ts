import { PrismaClient, RoomCategory, VehicleType, QuoteStatus, CustomizationType, CostAllocationType, Currency, City, TrainTicketClass } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import Decimal from "decimal.js";
import {
  calculateBaselineOffer,
  calculateIndividualQuote,
} from "../core/finance/calculator";
import {
  projectCustomerFacingQuotation,
  verifyQuotationPrivacy,
  buildInternalFinancialReportData,
} from "../core/finance/projection";
import {
  renderCustomerQuotationHtml,
} from "../core/documents/customer-quotation-template";
import {
  renderInternalFinancialReportHtml,
} from "../core/documents/internal-report-template";
import { generatePdfFromHtml } from "../core/documents/pdf-generator";
import { isChromiumAvailable, getChromiumPath } from "../core/documents/browser";

const prisma = new PrismaClient();

async function runPhase6NeonVerification() {
  console.log("================================================================================");
  console.log(" MATHABA UMRAH MANAGER — PHASE 6: NEON POSTGRESQL & PDF VERIFICATION SUITE");
  console.log("================================================================================");

  try {
    // -------------------------------------------------------------------------
    // STEP 0: System & Database Engine Checks
    // -------------------------------------------------------------------------
    console.log("\n[STEP 0] Checking System & Database Environment...");
    const dbUrl = process.env.DATABASE_URL || "";
    const maskedUrl = dbUrl.replace(/:([^@]+)@/, ":****@");
    console.log(`✓ Neon Database URL: ${maskedUrl}`);

    const hasChromium = isChromiumAvailable();
    const chromePath = getChromiumPath();
    console.log(`✓ Native Chromium Engine Available: ${hasChromium ? "YES" : "NO"}`);
    console.log(`✓ Chromium Executable Path: ${chromePath || "Not found"}`);
    if (!hasChromium) {
      throw new Error("Chromium/Chrome binary not found on host. Required for Phase 6 PDF generation.");
    }

    // -------------------------------------------------------------------------
    // STEP 1: Verify Global Settings in Neon Database
    // -------------------------------------------------------------------------
    console.log("\n[STEP 1] Verifying Neon Global Settings & Document Branding...");
    let settings = await prisma.globalSetting.findFirst();
    if (!settings) {
      settings = await prisma.globalSetting.create({
        data: {
          agencyName: "وكالة مَثابة لأسفار العمرة",
          agencyEmail: "contact@mathaba-umrah.com",
          agencyPhone: "+212 522 123 456",
          agencyAddress: "شارع الحسن الثاني، الدار البيضاء، المغرب",
          defaultVisaCostSar: new Decimal(525),
          sarToMadRate: new Decimal(2.70),
          eurToMadRate: new Decimal(10.85),
          documentFooterText: "وكالة مَثابة مرخصة من وزارة السياحة والحج والعمرة. جميع الأسعار نهائية بالدرهم المغربي.",
          quotationTerms: "العرض صالح لمدة 10 أيام. لا يُعد هذا المستند فاتورة ضريبية وإنما هو عرض سعر مبدئي.",
        },
      });
    } else {
      // Ensure terms and footer text are populated
      settings = await prisma.globalSetting.update({
        where: { id: settings.id },
        data: {
          documentFooterText: settings.documentFooterText || "وكالة مَثابة مرخصة من وزارة السياحة والحج والعمرة. جميع الأسعار نهائية بالدرهم المغربي.",
          quotationTerms: settings.quotationTerms || "العرض صالح لمدة 10 أيام. لا يُعد هذا المستند فاتورة ضريبية وإنما هو عرض سعر مبدئي.",
        },
      });
    }

    console.log(`✓ Agency Name: "${settings.agencyName}"`);
    console.log(`✓ Document Footer Text: "${settings.documentFooterText}"`);
    console.log(`✓ Quotation Terms: "${settings.quotationTerms?.slice(0, 50)}..."`);

    // -------------------------------------------------------------------------
    // STEP 2: Find or Create a Test Trip & Offer in Neon
    // -------------------------------------------------------------------------
    console.log("\n[STEP 2] Setting up Test Trip, Offer & Accommodation in Neon...");
    let testTrip = await prisma.umrahTrip.findFirst({
      where: { name: { contains: "Phase 6 Verification Trip" } },
      include: { offers: { include: { hotelStays: true, additionalTransports: true, trainExpenses: true } } },
    });

    if (!testTrip) {
      const slug = `phase-6-test-${Date.now()}`;
      testTrip = await prisma.umrahTrip.create({
        data: {
          name: "Phase 6 Verification Trip — رحلة رجب المعتمدة",
          slug,
          startDate: new Date("2026-12-15T00:00:00Z"),
          endDate: new Date("2026-12-25T00:00:00Z"),
          expectedPilgrims: 40,
          flightCost: new Decimal(7500),
          flightCurrency: Currency.MAD,
          flightAllocationType: CostAllocationType.PER_PERSON,
          airlineName: "الخطوط الملكية المغربية",
          groupBusCostSar: new Decimal(4400), // 110 SAR per pax
          groupBusCount: 1,
          sarToMadRate: new Decimal(2.70),
          eurToMadRate: new Decimal(10.85),
          visaCostSar: new Decimal(525), // 1,417.50 MAD per pax
          offers: {
            create: {
              name: "باقة النور الاقتصادية (Phase 6 Test)",
              fixedProfitMad: new Decimal(2000),
              isActive: true,
              hotelStays: {
                create: [
                  {
                    city: City.MAKKAH,
                    hotelName: "فندق أنوار الضيافة مكة",
                    checkInDate: new Date("2026-12-15T00:00:00Z"),
                    checkOutDate: new Date("2026-12-20T00:00:00Z"),
                    nightsCount: 5,
                    singleDoubleRateSar: new Decimal(500),
                    tripleRateSar: new Decimal(600),
                    quadRateSar: new Decimal(700),
                  },
                  {
                    city: City.MADINAH,
                    hotelName: "فندق دار التقوى المدينة",
                    checkInDate: new Date("2026-12-20T00:00:00Z"),
                    checkOutDate: new Date("2026-12-25T00:00:00Z"),
                    nightsCount: 5,
                    singleDoubleRateSar: new Decimal(450),
                    tripleRateSar: new Decimal(540),
                    quadRateSar: new Decimal(640),
                  },
                ],
              },
              trainExpenses: {
                create: {
                  departureStation: "محطة مكة المكرمة",
                  arrivalStation: "محطة المدينة المنورة",
                  ticketClass: TrainTicketClass.ECONOMY,
                  ticketPriceSar: new Decimal(250),
                  passengerCount: 40,
                  isIncluded: true,
                },
              },
            },
          },
        },
        include: { offers: { include: { hotelStays: true, additionalTransports: true, trainExpenses: true } } },
      });
    }

    const testOffer = testTrip.offers[0];
    console.log(`✓ Trip Loaded: "${testTrip.name}" (${testTrip.id})`);
    console.log(`✓ Offer Loaded: "${testOffer.name}" (${testOffer.id})`);
    console.log(`✓ Hotel Stays: ${testOffer.hotelStays.length} stays`);

    // -------------------------------------------------------------------------
    // STEP 3: Find or Create Individual Pilgrim Customized Quote
    // -------------------------------------------------------------------------
    console.log("\n[STEP 3] Setting up Individual Pilgrim Quote with Shared Private Transport...");
    let testQuote = await prisma.individualPilgrimQuote.findFirst({
      where: { offerId: testOffer.id, pilgrimName: { contains: "الحاج عبد الله التازي" } },
      include: { customizations: true },
    });

    if (!testQuote) {
      testQuote = await prisma.individualPilgrimQuote.create({
        data: {
          offerId: testOffer.id,
          pilgrimName: "الحاج عبد الله التازي",
          contactPhone: "+212 661 987 654",
          roomCategory: RoomCategory.DOUBLE,
          overrideProfitMad: null, // Uses baseline 2000 MAD
          commercialDiscountMad: new Decimal(300), // 300 MAD commercial discount
          status: QuoteStatus.CONFIRMED,
          customizations: {
            create: [
              {
                type: CustomizationType.ADD_PRIVATE_TRANSPORT,
                description: "سيارة خاصة GMC من مطار جدة إلى فندق مكة (مشاركة 3 معتمرين)",
                // Vehicle 600 SAR ÷ 3 = 200 SAR * 2.70 = 540 MAD
                supplierCostDeltaMad: new Decimal(540),
                sellingPriceDeltaMad: new Decimal(540),
                details: {
                  vehicleType: "GMC",
                  vehicleCostSar: 600,
                  passengersSharing: 3,
                  perPersonCostSar: 200,
                  perPersonCostMad: 540,
                },
              },
            ],
          },
        },
        include: { customizations: true },
      });
    }

    console.log(`✓ Individual Quote Loaded: "${testQuote.pilgrimName}" (${testQuote.id})`);
    console.log(`✓ Customizations Count: ${testQuote.customizations.length}`);

    // -------------------------------------------------------------------------
    // STEP 4: Financial Calculation Engine Execution
    // -------------------------------------------------------------------------
    console.log("\n[STEP 4] Executing Financial Calculation Engine...");
    const offerCalcInput = {
      offerName: testOffer.name,
      exchangeRates: {
        sarToMad: testTrip.sarToMadRate.toString(),
        eurToMad: testTrip.eurToMadRate.toString(),
      },
      hotelStays: testOffer.hotelStays.map((s) => ({
        hotelName: s.hotelName,
        city: s.city as "MAKKAH" | "MADINAH",
        checkInDate: s.checkInDate.toISOString().split("T")[0],
        checkOutDate: s.checkOutDate.toISOString().split("T")[0],
        nightsOverride: s.isNightsOverridden ? s.nightsCount : undefined,
        singleDoubleNightlyRateSar: s.singleDoubleRateSar.toNumber(),
        tripleNightlyRateSar: s.tripleRateSar.toNumber(),
        quadNightlyRateSar: s.quadRateSar.toNumber(),
      })),
      flight: {
        amount: testTrip.flightCost.toNumber(),
        currency: testTrip.flightCurrency,
        allocation: testTrip.flightAllocationType as "PER_PERSON" | "GROUP_TOTAL",
      },
      transportation: {
        groupBusTotalSar: testTrip.groupBusCostSar.toNumber(),
        groupPilgrimCount: testTrip.expectedPilgrims,
      },
      trainExpenses: testOffer.trainExpenses.map((tr) => ({
        departureStation: tr.departureStation,
        arrivalStation: tr.arrivalStation,
        ticketClass: tr.ticketClass as "ECONOMY" | "BUSINESS",
        ticketPriceSar: tr.ticketPriceSar.toNumber(),
        passengerCount: tr.passengerCount,
        isIncluded: tr.isIncluded,
      })),
      visaCostSar: testTrip.visaCostSar.toNumber(),
      fixedProfitMadPerPilgrim: testOffer.fixedProfitMad.toNumber(),
    };

    const offerResult = calculateBaselineOffer(offerCalcInput);
    const doubleBaseline = offerResult.roomBreakdowns.DOUBLE;

    console.log(`✓ Baseline Double Room Actual Cost: ${doubleBaseline.totalActualCostMad.toNumber()} MAD`);
    console.log(`✓ Baseline Double Room Final Selling Price: ${doubleBaseline.finalSellingPriceMad.toNumber()} MAD`);
    console.log(`✓ Baseline Double Room Profit: ${doubleBaseline.effectiveProfitMad.toNumber()} MAD`);

    // Individual pilgrim calculation
    const quoteCalc = calculateIndividualQuote(testQuote.pilgrimName, {
      baselineBreakdown: doubleBaseline,
      commercialDiscountMad: testQuote.commercialDiscountMad.toNumber(),
      customizationItems: testQuote.customizations.map((c) => ({
        type: c.type,
        description: c.description,
        supplierCostDeltaMad: c.supplierCostDeltaMad.toNumber(),
        sellingPriceDeltaMad: c.sellingPriceDeltaMad.toNumber(),
      })),
    });

    const expectedBaseCost = 16302;
    const expectedGmcDelta = 540;
    const expectedNewActualCost = expectedBaseCost + expectedGmcDelta; // 16,842 MAD
    const expectedConfiguredProfit = 2000;
    const expectedDiscount = 300;
    const expectedSellingPrice = expectedNewActualCost + expectedConfiguredProfit - expectedDiscount; // 18,542 MAD
    const expectedRealizedProfit = expectedSellingPrice - expectedNewActualCost; // 1,700 MAD

    console.log(`✓ Pilgrim Base Actual Cost: ${quoteCalc.supplierCostMad.toNumber()} MAD`);
    console.log(`✓ Pilgrim Supplier Additions (GMC share): +${quoteCalc.supplierCostAdditionsMad.toNumber()} MAD`);
    console.log(`✓ Pilgrim New Actual Cost: ${quoteCalc.totalEffectiveCostMad.toNumber()} MAD (expected: ${expectedNewActualCost} MAD)`);
    console.log(`✓ Pilgrim Final Selling Price: ${quoteCalc.finalSellingPriceMad.toNumber()} MAD (expected: ${expectedSellingPrice} MAD)`);
    console.log(`✓ Pilgrim Realized Net Profit: ${quoteCalc.netProfitMad.toNumber()} MAD (expected: ${expectedRealizedProfit} MAD)`);
    console.log(`✓ Deficit Flag: ${quoteCalc.isDeficit ? "DEFICIT!" : "HEALTHY PROFIT"}`);

    if (quoteCalc.totalEffectiveCostMad.toNumber() !== expectedNewActualCost) {
      throw new Error(`Cost mismatch: expected ${expectedNewActualCost}, got ${quoteCalc.totalEffectiveCostMad.toNumber()}`);
    }
    if (quoteCalc.finalSellingPriceMad.toNumber() !== expectedSellingPrice) {
      throw new Error(`Selling price mismatch: expected ${expectedSellingPrice}, got ${quoteCalc.finalSellingPriceMad.toNumber()}`);
    }
    if (quoteCalc.netProfitMad.toNumber() !== expectedRealizedProfit) {
      throw new Error(`Profit mismatch: expected ${expectedRealizedProfit}, got ${quoteCalc.netProfitMad.toNumber()}`);
    }

    // -------------------------------------------------------------------------
    // STEP 5: Privacy Engine Audit (Strict Zero Leak Guarantee)
    // -------------------------------------------------------------------------
    console.log("\n[STEP 5] Auditing Customer Quotation Privacy Engine...");
    const customerOfferQuotation = projectCustomerFacingQuotation({
      referenceNumber: `QT-OFFER-${testOffer.id.slice(0, 8)}`,
      issueDate: new Date().toISOString().split("T")[0],
      agencyName: settings.agencyName,
      agencyPhone: settings.agencyPhone,
      agencyEmail: settings.agencyEmail,
      agencyAddress: settings.agencyAddress,
      documentFooterText: settings.documentFooterText,
      tripName: testTrip.name,
      tripStartDate: testTrip.startDate.toISOString().split("T")[0],
      tripEndDate: testTrip.endDate.toISOString().split("T")[0],
      offerResult,
      selectedRoomCategory: "DOUBLE",
      includedServices: [
        "تأشيرة العمرة والتأمين الطبي الشامل",
        "تذاكر الطيران الدولي المباشر",
        "حافلات حديثة ومكيفة للمزارات والتنقلات",
        "تذاكر قطار الحرمين السريع بين مكة والمدينة",
      ],
      termsAndConditions: [settings.quotationTerms || ""],
    });

    const offerPrivacyAudit = verifyQuotationPrivacy(customerOfferQuotation as unknown as Record<string, unknown>);
    console.log(`✓ Offer Quotation Privacy Status: ${offerPrivacyAudit.isSafe ? "100% CLEAN" : "LEAK DETECTED"}`);
    if (!offerPrivacyAudit.isSafe) {
      throw new Error(`Offer quotation leaked fields: ${offerPrivacyAudit.leakedFields.join(", ")}`);
    }

    const customerPilgrimQuotation = projectCustomerFacingQuotation({
      referenceNumber: `QT-PILGRIM-${testQuote.id.slice(0, 8)}`,
      issueDate: new Date().toISOString().split("T")[0],
      agencyName: settings.agencyName,
      agencyPhone: settings.agencyPhone,
      agencyEmail: settings.agencyEmail,
      agencyAddress: settings.agencyAddress,
      documentFooterText: settings.documentFooterText,
      tripName: testTrip.name,
      tripStartDate: testTrip.startDate.toISOString().split("T")[0],
      tripEndDate: testTrip.endDate.toISOString().split("T")[0],
      offerResult,
      selectedRoomCategory: "DOUBLE",
      pilgrimQuote: quoteCalc,
      pilgrimName: testQuote.pilgrimName,
      contactPhone: testQuote.contactPhone,
      isIndividualQuote: true,
      customizationDescriptions: testQuote.customizations.map((c) => c.description),
      termsAndConditions: [settings.quotationTerms || ""],
    });

    const pilgrimPrivacyAudit = verifyQuotationPrivacy(customerPilgrimQuotation as unknown as Record<string, unknown>);
    console.log(`✓ Pilgrim Quotation Privacy Status: ${pilgrimPrivacyAudit.isSafe ? "100% CLEAN" : "LEAK DETECTED"}`);
    if (!pilgrimPrivacyAudit.isSafe) {
      throw new Error(`Pilgrim quotation leaked fields: ${pilgrimPrivacyAudit.leakedFields.join(", ")}`);
    }

    // -------------------------------------------------------------------------
    // STEP 6: Chromium PDF Rendering Engine & Visual Verification
    // -------------------------------------------------------------------------
    console.log("\n[STEP 6] Rendering Native Chromium Arabic PDFs...");

    // 1. Customer Quotation HTML & PDF
    const customerHtml = renderCustomerQuotationHtml(customerPilgrimQuotation);
    console.log(`✓ Customer HTML Rendered (${customerHtml.length} chars)`);
    const customerPdfBuffer = await generatePdfFromHtml(customerHtml);
    console.log(`✓ Customer PDF Generated (${customerPdfBuffer.length} bytes)`);

    // Verify PDF header
    const pdfMagic = customerPdfBuffer.subarray(0, 4).toString("ascii");
    if (pdfMagic !== "%PDF") {
      throw new Error(`Invalid PDF header: ${pdfMagic}`);
    }

    // 2. Internal Financial Report Data, HTML & PDF
    const internalReportData = buildInternalFinancialReportData({
      reportReference: `MTH-AUDIT-${testQuote.id.slice(0, 8)}`,
      generationDate: new Date().toISOString().split("T")[0],
      isDraft: false,
      agencyName: settings.agencyName,
      tripName: testTrip.name,
      tripDates: {
        start: testTrip.startDate.toISOString().split("T")[0],
        end: testTrip.endDate.toISOString().split("T")[0],
        nightsCount: 10,
      },
      expectedPilgrims: testTrip.expectedPilgrims,
      exchangeRates: {
        sarToMad: testTrip.sarToMadRate.toNumber(),
        eurToMad: testTrip.eurToMadRate.toNumber(),
      },
      offerName: testOffer.name,
      pilgrimName: testQuote.pilgrimName,
      isIndividualQuote: true,
      roomCategory: "DOUBLE",
      hotelStaysBreakdown: testOffer.hotelStays.map((s) => {
        const fullRoomSar = s.singleDoubleRateSar.toNumber() * s.nightsCount;
        const perPersonSar = fullRoomSar / 2;
        return {
          hotelName: s.hotelName,
          city: s.city,
          checkInDate: s.checkInDate.toISOString().split("T")[0],
          checkOutDate: s.checkOutDate.toISOString().split("T")[0],
          nights: s.nightsCount,
          isOverridden: s.isNightsOverridden,
          singleDoubleRateSar: s.singleDoubleRateSar.toNumber(),
          tripleRateSar: s.tripleRateSar.toNumber(),
          quadRateSar: s.quadRateSar.toNumber(),
          fullRoomTotalSar: fullRoomSar,
          perPersonSar: perPersonSar,
          perPersonMad: perPersonSar * testTrip.sarToMadRate.toNumber(),
        };
      }),
      flightExpense: {
        amount: testTrip.flightCost.toNumber(),
        currency: testTrip.flightCurrency,
        allocationType: testTrip.flightAllocationType,
        perPilgrimMad: testTrip.flightCost.toNumber(),
      },
      visaExpense: {
        perPilgrimSar: testTrip.visaCostSar.toNumber(),
        perPilgrimMad: testTrip.visaCostSar.toNumber() * testTrip.sarToMadRate.toNumber(),
        isHistoricalSnapshot: true,
      },
      groupBusExpense: {
        totalCostSar: testTrip.groupBusCostSar.toNumber(),
        pilgrimCount: testTrip.expectedPilgrims,
        perPilgrimSar: testTrip.groupBusCostSar.toNumber() / testTrip.expectedPilgrims,
        perPilgrimMad: (testTrip.groupBusCostSar.toNumber() / testTrip.expectedPilgrims) * testTrip.sarToMadRate.toNumber(),
        isMaintained: true,
      },
      additionalTransports: [],
      trainExpenses: testOffer.trainExpenses.map((tr) => ({
        departureStation: tr.departureStation,
        arrivalStation: tr.arrivalStation,
        ticketClass: tr.ticketClass,
        ticketPriceSar: tr.ticketPriceSar.toNumber(),
        passengerCount: tr.passengerCount,
        perPilgrimMad: tr.ticketPriceSar.toNumber() * testTrip.sarToMadRate.toNumber(),
        isIncluded: tr.isIncluded,
      })),
      individualCustomizations: testQuote.customizations.map((c) => ({
        type: c.type,
        description: c.description,
        supplierCostDeltaMad: c.supplierCostDeltaMad.toNumber(),
        sellingPriceDeltaMad: c.sellingPriceDeltaMad.toNumber(),
      })),
      roomPricingSummary: {
        baseActualCostMad: quoteCalc.supplierCostMad.toNumber(),
        supplierCostAdditionsMad: quoteCalc.supplierCostAdditionsMad.toNumber(),
        supplierCostReductionsMad: quoteCalc.supplierCostReductionsMad.toNumber(),
        netSupplierCostDeltaMad: quoteCalc.supplierCostDeltaMad.toNumber(),
        newActualCostMad: quoteCalc.totalEffectiveCostMad.toNumber(),
        configuredProfitMad: quoteCalc.baseProfitMad.toNumber(),
        isProfitOverridden: quoteCalc.isProfitOverridden,
        commercialDiscountMad: quoteCalc.appliedDiscountMad.toNumber(),
        finalSellingPriceMad: quoteCalc.finalSellingPriceMad.toNumber(),
        realizedProfitMad: quoteCalc.netProfitMad.toNumber(),
      },
    });

    const internalHtml = renderInternalFinancialReportHtml(internalReportData);
    console.log(`✓ Internal Report HTML Rendered (${internalHtml.length} chars)`);
    const internalPdfBuffer = await generatePdfFromHtml(internalHtml);
    console.log(`✓ Internal Report PDF Generated (${internalPdfBuffer.length} bytes)`);

    // Verify PDF header
    if (internalPdfBuffer.subarray(0, 4).toString("ascii") !== "%PDF") {
      throw new Error("Invalid Internal Report PDF header");
    }

    // -------------------------------------------------------------------------
    // STEP 7: Save Output Artifacts for Visual Confirmation
    // -------------------------------------------------------------------------
    console.log("\n[STEP 7] Writing Sample PDFs to Disk...");
    const artifactsDir = path.resolve(
      "C:\\Users\\ALSAKB1\\.gemini\\antigravity\\brain\\5e7f9109-5ea6-4698-8817-897c4c5e00c5\\scratch"
    );
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    const customerPdfPath = path.join(artifactsDir, "sample-customer-quotation.pdf");
    const internalPdfPath = path.join(artifactsDir, "sample-internal-report.pdf");

    fs.writeFileSync(customerPdfPath, customerPdfBuffer);
    fs.writeFileSync(internalPdfPath, internalPdfBuffer);

    console.log(`✓ Saved Customer Quotation PDF: ${customerPdfPath} (${customerPdfBuffer.length} bytes)`);
    console.log(`✓ Saved Internal Financial Report PDF: ${internalPdfPath} (${internalPdfBuffer.length} bytes)`);

    console.log("\n================================================================================");
    console.log(" 🎉 PHASE 6 VERIFICATION COMPLETED SUCCESSFULLY WITH 100% INTEGRITY!");
    console.log("================================================================================");
  } catch (error) {
    console.error("\n❌ PHASE 6 VERIFICATION FAILED:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase6NeonVerification();
