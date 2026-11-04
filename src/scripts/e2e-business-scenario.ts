import fs from "fs";
import path from "path";
import Decimal from "decimal.js";
import { launchBrowser } from "../core/documents/browser";
import { generatePdfFromHtml } from "../core/documents/pdf-generator";
import { renderCustomerQuotationHtml } from "../core/documents/customer-quotation-template";
import { renderInternalFinancialReportHtml } from "../core/documents/internal-report-template";
import {
  projectCustomerFacingQuotation,
  buildInternalFinancialReportData,
  verifyQuotationPrivacy,
} from "../core/finance/projection";
import {
  calculateBaselineOffer,
  calculateIndividualQuote,
} from "../core/finance/calculator";
import {
  BaselineOfferCalculationInput,
  ExchangeRates,
} from "../core/finance/types";

async function main() {
  console.log("================================================================================");
  console.log(" STEP 6: END-TO-END BUSINESS SCENARIO VERIFICATION & REPORTING");
  console.log("================================================================================");

  const rates: ExchangeRates = {
    sarToMad: "2.70",
    eurToMad: "10.85",
  };

  const agency = {
    name: "وكالة مَثابة الدولية لإدارة رحلات العمرة والزيارة",
    phone: "+212 522 987 654",
    email: "contact@mathaba-umrah.ma",
    address: "شارع المسيرة الخضراء، المعاريف، الدار البيضاء، المملكة المغربية",
    documentFooterText:
      "وكالة مَثابة معتمدة رسمياً من وزارة السياحة المغربية (رخصة رقم 4589/2026) ومن وزارة الحج والعمرة بالمملكة العربية السعودية.",
    quotationTerms: [
      "عرض السعر هذا شخصي وملزم للوكالة لمدة 10 أيام تقويمية من تاريخ إصداره.",
      "جواز السفر يجب أن يكون صالحاً لمدة لا تقل عن 6 أشهر ابتداءً من تاريخ المغادرة المعتمد.",
      "السعر النهائي يشمل رسوم التأشيرة الإلكترونية، التأمين الطبي الشامل، وتذكرة قطار الحرمين السريع.",
      "تخضع سياسات الدخول والمغادرة للفنادق المعتمدة (تسجيل الوصول 16:00، تسجيل المغادرة 12:00).",
      "لا يُعد هذا المستند فاتورة ضريبية وإنما هو عرض سعر رسمي ملزم للطرفين خلال سريانه.",
    ],
  };

  // 1. Setup Economy Offer ("باقة الوفاق الاقتصادية")
  const economyInput: BaselineOfferCalculationInput = {
    offerName: "باقة الوفاق الاقتصادية",
    exchangeRates: rates,
    flight: {
      amount: 8000,
      currency: "MAD",
      allocation: "PER_PERSON",
    },
    transportation: {
      groupBusTotalSar: 4500, // 45 pax = 100 SAR/pax = 270 MAD
      groupPilgrimCount: 45,
    },
    trainExpenses: [
      {
        departureStation: "محطة قطار مكة المكرمة (الرصيفة)",
        arrivalStation: "محطة قطار الحرمين السريع بالمدينة المنورة",
        ticketClass: "ECONOMY",
        ticketPriceSar: 172.5, // 172.50 SAR = 465.75 MAD
        passengerCount: 45,
        isIncluded: true,
      },
    ],
    visaCostSar: 525, // 525 SAR = 1417.50 MAD
    hotelStays: [
      {
        hotelName: "فندق أنوار الضيافة مكة المكرمة",
        city: "MAKKAH",
        checkInDate: "2026-11-15",
        checkOutDate: "2026-11-22", // 7 nights
        singleDoubleNightlyRateSar: 500, // Double: 250 SAR/night = 1750 SAR = 4725 MAD
        tripleNightlyRateSar: 450,       // Triple: 150 SAR/night = 1050 SAR = 2835 MAD
        quadNightlyRateSar: 400,         // Quad: 100 SAR/night = 700 SAR = 1890 MAD
      },
      {
        hotelName: "فندق رويال ديار المدينة المنورة",
        city: "MADINAH",
        checkInDate: "2026-11-22",
        checkOutDate: "2026-11-27", // 5 nights
        singleDoubleNightlyRateSar: 360, // Double: 180 SAR/night = 900 SAR = 2430 MAD
        tripleNightlyRateSar: 330,       // Triple: 110 SAR/night = 550 SAR = 1485 MAD
        quadNightlyRateSar: 280,         // Quad: 70 SAR/night = 350 SAR = 945 MAD
      },
    ],
    fixedProfitMadPerPilgrim: 2000,
  };

  const economyResult = calculateBaselineOffer(economyInput);

  console.log("\n[1] Economy Offer Calculated:");
  for (const [room, b] of Object.entries(economyResult.roomBreakdowns)) {
    console.log(
      `  - ${room.padEnd(6)}: Base Cost = ${b.totalActualCostMad.toFixed(2)} MAD | Selling Price (+2000 profit) = ${b.finalSellingPriceMad.toFixed(2)} MAD`
    );
  }

  // 2. Setup Premium Offer ("باقة النخبة الملكية المتميزة")
  const premiumInput: BaselineOfferCalculationInput = {
    offerName: "باقة النخبة الملكية المتميزة",
    exchangeRates: rates,
    flight: {
      amount: 8000,
      currency: "MAD",
      allocation: "PER_PERSON",
    },
    transportation: {
      groupBusTotalSar: 4500,
      groupPilgrimCount: 45,
    },
    trainExpenses: [
      {
        departureStation: "محطة قطار مكة المكرمة (الرصيفة)",
        arrivalStation: "محطة قطار الحرمين السريع بالمدينة المنورة",
        ticketClass: "BUSINESS",
        ticketPriceSar: 172.5,
        passengerCount: 45,
        isIncluded: true,
      },
    ],
    visaCostSar: 525,
    hotelStays: [
      {
        hotelName: "فندق فيرمونت برج ساعة مكة المكرمة (5 نجوم)",
        city: "MAKKAH",
        checkInDate: "2026-11-15",
        checkOutDate: "2026-11-22", // 7 nights
        singleDoubleNightlyRateSar: 1500,
        tripleNightlyRateSar: 1350,
        quadNightlyRateSar: 1200,
      },
      {
        hotelName: "فندق دار التقوى المدينة المنورة (5 نجوم)",
        city: "MADINAH",
        checkInDate: "2026-11-22",
        checkOutDate: "2026-11-27", // 5 nights
        singleDoubleNightlyRateSar: 1000,
        tripleNightlyRateSar: 900,
        quadNightlyRateSar: 800,
      },
    ],
    fixedProfitMadPerPilgrim: 4000,
  };

  const premiumResult = calculateBaselineOffer(premiumInput);

  console.log("\n[2] Premium Offer Calculated:");
  for (const [room, b] of Object.entries(premiumResult.roomBreakdowns)) {
    console.log(
      `  - ${room.padEnd(6)}: Base Cost = ${b.totalActualCostMad.toFixed(2)} MAD | Selling Price (+4000 profit) = ${b.finalSellingPriceMad.toFixed(2)} MAD`
    );
  }

  // 3. Setup Individual Pilgrim Customization (Double Room on Economy Offer)
  const doubleBreakdown = economyResult.roomBreakdowns.DOUBLE;
  const baseActualCostMad = doubleBreakdown.totalActualCostMad.toNumber(); // 17,308.25 MAD

  // Customization: Private GMC vehicle (600 SAR) shared among 3 pilgrims = 200 SAR each = 540 MAD
  const pilgrimName = "الحاج عبد الرحمن بن إدريس التازي";
  const pilgrimCalc = calculateIndividualQuote(pilgrimName, {
    baselineBreakdown: doubleBreakdown,
    commercialDiscountMad: 300,
    customizationItems: [
      {
        type: "ADD_PRIVATE_TRANSPORT",
        description: "سيارة خاصة GMC يوكون (مطار جدة إلى فندق مكة) مشتركة بين 3 معتمرين",
        supplierCostDeltaMad: 540,
        sellingPriceDeltaMad: 540,
        details: {
          vehicleType: "GMC",
          vehicleCostSar: 600,
          passengersSharing: 3,
          perPersonCostSar: 200,
          perPersonCostMad: 540,
        },
      },
    ],
  });

  console.log("\n[3] Individual Pilgrim Customization Calculation:");
  console.log(`  - Pilgrim Name: ${pilgrimName}`);
  console.log(`  - Room Type: DOUBLE`);
  console.log(`  - Base Actual Cost: ${pilgrimCalc.supplierCostMad.toFixed(2)} MAD`);
  console.log(`  - Customization Additions: +${pilgrimCalc.supplierCostAdditionsMad.toFixed(2)} MAD`);
  console.log(`  - New Effective Actual Cost: ${pilgrimCalc.totalEffectiveCostMad.toFixed(2)} MAD`);
  console.log(`  - Configured Profit: +${pilgrimCalc.baseProfitMad.toFixed(2)} MAD`);
  console.log(`  - Commercial Discount: -${pilgrimCalc.appliedDiscountMad.toFixed(2)} MAD`);
  console.log(`  - Final Selling Price: ${pilgrimCalc.finalSellingPriceMad.toFixed(2)} MAD`);
  console.log(`  - Realized Net Profit: ${pilgrimCalc.netProfitMad.toFixed(2)} MAD`);

  // Assertions for exact correctness:
  if (pilgrimCalc.supplierCostMad.toNumber() !== 17308.25) {
    throw new Error(`Expected supplierCostMad to be 17308.25, got ${pilgrimCalc.supplierCostMad}`);
  }
  if (pilgrimCalc.supplierCostAdditionsMad.toNumber() !== 540) {
    throw new Error(`Expected supplierCostAdditionsMad to be 540, got ${pilgrimCalc.supplierCostAdditionsMad}`);
  }
  if (pilgrimCalc.totalEffectiveCostMad.toNumber() !== 17848.25) {
    throw new Error(`Expected totalEffectiveCostMad to be 17848.25, got ${pilgrimCalc.totalEffectiveCostMad}`);
  }
  if (pilgrimCalc.finalSellingPriceMad.toNumber() !== 19548.25) {
    throw new Error(`Expected finalSellingPriceMad to be 19548.25, got ${pilgrimCalc.finalSellingPriceMad}`);
  }
  if (pilgrimCalc.netProfitMad.toNumber() !== 1700) {
    throw new Error(`Expected netProfitMad to be 1700, got ${pilgrimCalc.netProfitMad}`);
  }
  console.log("✓ Mathematical assertions passed with 100% precision!");

  // 4. Project Customer-Facing Quotation
  const customerQuotation = projectCustomerFacingQuotation({
    referenceNumber: "QT-2026-E2E-001",
    issueDate: "2026-11-04",
    agencyName: agency.name,
    agencyPhone: agency.phone,
    agencyEmail: agency.email,
    agencyAddress: agency.address,
    documentFooterText: agency.documentFooterText,
    tripName: "رحلة عمرة شعبان والتحضير لرمضان 1448 هـ",
    tripStartDate: "2026-11-15",
    tripEndDate: "2026-11-27",
    offerResult: economyResult,
    selectedRoomCategory: "DOUBLE",
    pilgrimQuote: pilgrimCalc,
    pilgrimName: pilgrimCalc.pilgrimName,
    contactPhone: "+212 661 234 567",
    isIndividualQuote: true,
    flightDetails: {
      airlineName: "الخطوط الملكية المغربية (Royal Air Maroc) — رحلة مباشرة",
      flightIncluded: true,
      description: "تذكرة طيران ذهاب وإياب مباشرة مع حقيبتين بوزن 23 كجم لكل حقيبة",
    },
    transportServices: [
      {
        routeName: "حافلة حديثة مكيفة للرحلات الجماعية والمزارات",
        description: "شاملة كافة التنقلات الميدانية المعتمدة في البرنامج",
      },
      {
        routeName: "سيارة خاصة GMC يوكون (مطار جدة إلى فندق مكة)",
        vehicleType: "GMC Yukon",
        isPrivate: true,
        description: "خدمة نقل خاص للمعتمر ورفاقه (حصة 1 من 3 معتمرين)",
      },
    ],
    trainJourneys: [
      {
        departureStation: "محطة قطار مكة المكرمة (الرصيفة)",
        arrivalStation: "محطة قطار الحرمين السريع بالمدينة المنورة",
        ticketClass: "ECONOMY",
        travelDate: "2026-11-22",
      },
    ],
    includedServices: [
      "تأشيرة العمرة الإلكترونية والتأمين الصحي الإلزامي الشامل",
      "الإقامة 7 ليالٍ بفندق أنوار الضيافة بمكة المكرمة",
      "الإقامة 5 ليالٍ بفندق رويال ديار بالمدينة المنورة",
      "تذاكر قطار الحرمين السريع (درجة اقتصادية)",
      "المزارات الدينية والتاريخية بمكة المكرمة والمدينة المنورة",
      "مرشد ديني ومرافق إداري طوال فترة الرحلة",
      "حقيبة سفر ومصحف شريف وعبوة 5 لترات من ماء زمزم المبارك",
    ],
    customizationDescriptions: [
      "سيارة خاصة GMC يوكون (مطار جدة إلى فندق مكة) مشتركة بين 3 معتمرين",
      "خصم تجاري خاص ممنوح للحجز المبكر: 300 د.م.",
    ],
    termsAndConditions: agency.quotationTerms,
  });

  // Verify Privacy
  const privacyCheck = verifyQuotationPrivacy(customerQuotation as unknown as Record<string, unknown>);
  if (!privacyCheck.isSafe) {
    throw new Error(`Quotation privacy check failed: ${privacyCheck.leakedFields.join(", ")}`);
  }
  console.log("✓ Customer Quotation Privacy verified: Zero internal costs or margins exposed.");

  // 5. Build Internal Financial Report
  const internalReport = buildInternalFinancialReportData({
    reportReference: "AUDIT-2026-E2E-001",
    generationDate: "2026-11-04",
    isDraft: false,
    agencyName: agency.name,
    tripName: "رحلة عمرة شعبان والتحضير لرمضان 1448 هـ",
    tripDates: {
      start: "2026-11-15",
      end: "2026-11-27",
      nightsCount: 12,
    },
    expectedPilgrims: 45,
    exchangeRates: {
      sarToMad: 2.70,
      eurToMad: 10.85,
    },
    offerName: economyResult.offerName,
    pilgrimName: pilgrimCalc.pilgrimName,
    isIndividualQuote: true,
    roomCategory: "DOUBLE",
    hotelStaysBreakdown: [
      {
        hotelName: "فندق أنوار الضيافة مكة المكرمة",
        city: "MAKKAH",
        checkInDate: "2026-11-15",
        checkOutDate: "2026-11-22",
        nights: 7,
        isOverridden: false,
        singleDoubleRateSar: 500,
        tripleRateSar: 450,
        quadRateSar: 400,
        fullRoomTotalSar: 3500,
        perPersonSar: 1750,
        perPersonMad: 4725,
      },
      {
        hotelName: "فندق رويال ديار المدينة المنورة",
        city: "MADINAH",
        checkInDate: "2026-11-22",
        checkOutDate: "2026-11-27",
        nights: 5,
        isOverridden: false,
        singleDoubleRateSar: 360,
        tripleRateSar: 330,
        quadRateSar: 280,
        fullRoomTotalSar: 1800,
        perPersonSar: 900,
        perPersonMad: 2430,
      },
    ],
    flightExpense: {
      amount: 8000,
      currency: "MAD",
      allocationType: "PER_PERSON",
      perPilgrimMad: 8000,
    },
    visaExpense: {
      perPilgrimSar: 525,
      perPilgrimMad: 1417.5,
      isHistoricalSnapshot: true,
    },
    groupBusExpense: {
      totalCostSar: 4500,
      pilgrimCount: 45,
      perPilgrimSar: 100,
      perPilgrimMad: 270,
      isMaintained: true,
    },
    additionalTransports: [],
    trainExpenses: [
      {
        departureStation: "محطة مكة المكرمة (الرصيفة)",
        arrivalStation: "محطة قطار الحرمين السريع بالمدينة المنورة",
        ticketClass: "ECONOMY",
        ticketPriceSar: 172.5,
        passengerCount: 45,
        perPilgrimMad: 465.75,
        isIncluded: true,
      },
    ],
    individualCustomizations: [
      {
        type: "ADD_PRIVATE_TRANSPORT",
        description: "سيارة خاصة GMC يوكون (مطار جدة إلى فندق مكة) مشتركة بين 3 معتمرين",
        supplierCostDeltaMad: 540,
        details: {
          vehicleType: "GMC",
          vehicleCostSar: 600,
          passengersSharing: 3,
        },
      },
    ],
    roomPricingSummary: {
      baseActualCostMad: pilgrimCalc.supplierCostMad.toNumber(),
      supplierCostAdditionsMad: pilgrimCalc.supplierCostAdditionsMad.toNumber(),
      supplierCostReductionsMad: pilgrimCalc.supplierCostReductionsMad.toNumber(),
      netSupplierCostDeltaMad: pilgrimCalc.supplierCostDeltaMad.toNumber(),
      newActualCostMad: pilgrimCalc.totalEffectiveCostMad.toNumber(),
      configuredProfitMad: pilgrimCalc.baseProfitMad.toNumber(),
      isProfitOverridden: pilgrimCalc.isProfitOverridden,
      commercialDiscountMad: pilgrimCalc.appliedDiscountMad.toNumber(),
      finalSellingPriceMad: pilgrimCalc.finalSellingPriceMad.toNumber(),
      realizedProfitMad: pilgrimCalc.netProfitMad.toNumber(),
    },
    multiRoomBreakdowns: economyResult.roomBreakdowns,
  });

  // 6. Generate PDFs
  const customerHtml = renderCustomerQuotationHtml(customerQuotation);
  const internalHtml = renderInternalFinancialReportHtml(internalReport);

  const artifactsDir = "C:\\Users\\ALSAKB1\\.gemini\\antigravity\\brain\\5e7f9109-5ea6-4698-8817-897c4c5e00c5";
  const scratchDir = path.join(artifactsDir, "scratch");
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  console.log("\n[4] Generating PDFs...");
  const customerPdf = await generatePdfFromHtml(customerHtml);
  const internalPdf = await generatePdfFromHtml(internalHtml);

  const customerPdfPath = path.join(scratchDir, "e2e-customer-quotation.pdf");
  const internalPdfPath = path.join(scratchDir, "e2e-internal-report.pdf");

  fs.writeFileSync(customerPdfPath, customerPdf);
  fs.writeFileSync(internalPdfPath, internalPdf);

  console.log(`✓ Saved Customer PDF: ${customerPdfPath} (${customerPdf.length} bytes)`);
  console.log(`✓ Saved Internal PDF: ${internalPdfPath} (${internalPdf.length} bytes)`);

  // 7. Visual Render
  console.log("\n[5] Capturing High-Resolution PNG Screenshots for Step 6...");
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

    await page.setContent(customerHtml, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");
    const customerImgPath = path.join(artifactsDir, "e2e-customer-quotation.png");
    await page.screenshot({ path: customerImgPath, fullPage: true });
    console.log(`✓ Captured E2E Customer Quotation Image: ${customerImgPath}`);

    await page.setContent(internalHtml, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");
    const internalImgPath = path.join(artifactsDir, "e2e-internal-financial-report.png");
    await page.screenshot({ path: internalImgPath, fullPage: true });
    console.log(`✓ Captured E2E Internal Report Image: ${internalImgPath}`);
  } finally {
    await browser.close();
  }

  console.log("\n================================================================================");
  console.log(" END-TO-END BUSINESS SCENARIO COMPLETE & FULLY VERIFIED");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("E2E Scenario Error:", err);
  process.exit(1);
});
