import fs from "fs";
import path from "path";
import Decimal from "decimal.js";
import { launchBrowser } from "../core/documents/browser";
import { generatePdfFromHtml } from "../core/documents/pdf-generator";
import { renderCustomerQuotationHtml } from "../core/documents/customer-quotation-template";
import { renderInternalFinancialReportHtml } from "../core/documents/internal-report-template";
import { projectCustomerFacingQuotation, buildInternalFinancialReportData } from "../core/finance/projection";
import { calculateBaselineOffer, calculateIndividualQuote } from "../core/finance/calculator";
import { BaselineOfferCalculationInput, ExchangeRates } from "../core/finance/types";

async function main() {
  console.log("================================================================================");
  console.log(" STEP 2: ARABIC PDF QUALITY & VISUAL FIDELITY AUDIT");
  console.log("================================================================================");

  const rates: ExchangeRates = {
    sarToMad: "2.70",
    eurToMad: "10.85",
  };

  const agency = {
    name: "وكالة مَثابة الدولية للأسفار والعمرة المعتمدة",
    phone: "+212 522 987 654",
    email: "contact@mathaba-umrah.ma",
    address: "شارع المسيرة الخضراء، المعاريف، الدار البيضاء، المملكة المغربية",
    documentFooterText: "وكالة مَثابة مرخصة رسمياً برقم ترخيص 4589/2026 من وزارة السياحة والصناعة التقليدية والاقتصاد التضامني بالمغرب ووزارة الحج والعمرة بالمملكة العربية السعودية.",
    quotationTerms: [
      "صلاحية هذا العرض سارية لمدة 10 أيام تقويمية من تاريخ إصداره المبين أعلاه.",
      "جواز السفر يجب أن يكون ساري المفعول لمدة لا تقل عن 6 أشهر من تاريخ السفر المعتمد.",
      "الأسعار تشمل رسوم التأشيرة الإلكترونية والتأمين الطبي الشامل والضرائب المعمول بها في المغرب والمملكة العربية السعودية.",
      "تخضع مواعيد الدخول (الساعة 16:00) والخروج (الساعة 12:00) لسياسات الفنادق المعتمدة بمكة المكرمة والمدينة المنورة.",
      "لا يُعد هذا المستند فاتورة ضريبية نهائية وإنما هو عرض سعر رسمي ملزم للوكالة خلال فترة صلاحيته.",
    ],
  };

  // Realistic Offer with long Arabic names, 2 hotel stays, 4 room categories
  const offerInput: BaselineOfferCalculationInput = {
    offerName: "باقة الهدى الملكية الفاخرة (VIP 5-Star)",
    exchangeRates: rates,
    hotelStays: [
      {
        hotelName: "فندق سويس أوتيل المقام مكة المكرمة المطل مباشرة على ساحات الحرم المكي الشريف",
        city: "MAKKAH",
        checkInDate: "2026-12-10",
        checkOutDate: "2026-12-17", // 7 nights
        singleDoubleNightlyRateSar: 1200,
        tripleNightlyRateSar: 1450,
        quadNightlyRateSar: 1700,
      },
      {
        hotelName: "فندق شذا المدينة المنورة الفاخر بجوار الروضة الشريفة وباب السلام",
        city: "MADINAH",
        checkInDate: "2026-12-17",
        checkOutDate: "2026-12-22", // 5 nights
        singleDoubleNightlyRateSar: 850,
        tripleNightlyRateSar: 1050,
        quadNightlyRateSar: 1250,
      },
    ],
    flight: {
      amount: 8200,
      currency: "MAD",
      allocation: "PER_PERSON",
    },
    transportation: {
      groupBusTotalSar: 5400, // 45 pax = 120 SAR per pax = 324 MAD
      groupPilgrimCount: 45,
    },
    trainExpenses: [
      {
        departureStation: "محطة مكة المكرمة (الرصيفة)",
        arrivalStation: "محطة قطار الحرمين السريع بالمدينة المنورة",
        ticketClass: "BUSINESS",
        ticketPriceSar: 350,
        passengerCount: 45,
        isIncluded: true,
      },
    ],
    visaCostSar: 525,
    fixedProfitMadPerPilgrim: 2500,
  };

  const offerResult = calculateBaselineOffer(offerInput);
  const doubleBase = offerResult.roomBreakdowns.DOUBLE;

  // Individual pilgrim exception: Private GMC (600 SAR ÷ 3 = 200 SAR = 540 MAD) + 400 MAD discount
  const pilgrimCalc = calculateIndividualQuote("الحاج الدكتور عبد السلام بن جلون الفاسي", {
    baselineBreakdown: doubleBase,
    commercialDiscountMad: 400,
    customizationItems: [
      {
        type: "ADD_PRIVATE_TRANSPORT",
        description: "سيارة خاصة فاخرة GMC Yukon XL من مطار الملك عبد العزيز بجدة إلى فندق مكة (مشاركة 3 معتمرين)",
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
      {
        type: "ADD_SERVICE",
        description: "باقة تجوال وإنترنت غير محدود داخل المملكة مع شريحة اتصالات 5G",
        supplierCostDeltaMad: 150,
        sellingPriceDeltaMad: 150,
      },
    ],
  });

  console.log("Calculated Baseline Double Room Actual Cost:", doubleBase.totalActualCostMad.toNumber(), "MAD");
  console.log("Calculated Pilgrim New Actual Cost:", pilgrimCalc.totalEffectiveCostMad.toNumber(), "MAD");
  console.log("Calculated Pilgrim Final Selling Price:", pilgrimCalc.finalSellingPriceMad.toNumber(), "MAD");
  console.log("Calculated Pilgrim Realized Net Profit:", pilgrimCalc.netProfitMad.toNumber(), "MAD");

  // Project Customer-Facing Quotation
  const customerQuotation = projectCustomerFacingQuotation({
    referenceNumber: "QT-2026-RJB-048",
    issueDate: "2026-11-04",
    agencyName: agency.name,
    agencyPhone: agency.phone,
    agencyEmail: agency.email,
    agencyAddress: agency.address,
    documentFooterText: agency.documentFooterText,
    tripName: "رحلة عمرة الإسراء والمعراج المباركة — رجب 1448 هـ",
    tripStartDate: "2026-12-10",
    tripEndDate: "2026-12-22",
    offerResult,
    selectedRoomCategory: "DOUBLE",
    pilgrimQuote: pilgrimCalc,
    pilgrimName: pilgrimCalc.pilgrimName,
    contactPhone: "+212 661 234 567",
    isIndividualQuote: true,
    flightDetails: {
      airlineName: "الخطوط الملكية المغربية (Royal Air Maroc) — رحلة مباشرة الدار البيضاء ➔ جدة",
      flightIncluded: true,
      description: "تذكرة طيران ذهاب وإياب مباشرة مع حقيبتين بوزن 23 كجم لكل حقيبة",
    },
    transportServices: [
      {
        routeName: "تنقلات المشاعر والمزارات بالحافلات الحديثة",
        isPrivate: false,
        description: "حافلات VIP مكيفة موديل 2026 لزيارة مزارات مكة المكرمة والمدينة المنورة",
      },
      {
        routeName: "نقل خاص: مطار جدة ➔ فندق مكة المكرمة",
        vehicleType: "GMC Yukon XL",
        isPrivate: true,
        description: "سيارة خاصة فاخرة ومريحة مخصصة ومشاركة بين 3 معتمرين فقط",
      },
    ],
    trainJourneys: [
      {
        departureStation: "محطة مكة المكرمة (الرصيفة)",
        arrivalStation: "محطة المدينة المنورة",
        ticketClass: "BUSINESS",
      },
    ],
    includedServices: [
      "تأشيرة العمرة الإلكترونية والتأمين الصحي الإلزامي الشامل",
      "الإقامة 7 ليالٍ بفندق 5 نجوم مطل على الكعبة المشرفة بمكة المكرمة مع وجبة الإفطار (بوفيه مفتوح)",
      "الإقامة 5 ليالٍ بفندق 5 نجوم بجوار الحرم النبوي الشريف بالمدينة المنورة مع الإفطار",
      "تذاكر قطار الحرمين السريع (درجة رجال الأعمال Business Class)",
      "المزارات الدينية والتاريخية بمكة المكرمة (غار حراء، ثور، عرفات، منى) والمدينة المنورة (قباء، أحد)",
      "مرشد ديني ومرافق إداري على مدار الساعة طوال فترة الرحلة",
      "حقيبة فاخرة ومصحف شريف وعبوة 5 لترات من ماء زمزم المبارك",
    ],
    customizationDescriptions: [
      "سيارة خاصة فاخرة GMC Yukon XL من مطار جدة إلى فندق مكة",
      "باقة تجوال وإنترنت غير محدود داخل المملكة (شريحة 5G)",
      "خصم تجاري خاص ممنوح: 400 د.م.",
    ],
    termsAndConditions: agency.quotationTerms,
  });

  // Build Internal Financial Report
  const internalReport = buildInternalFinancialReportData({
    reportReference: "AUDIT-2026-RJB-048",
    generationDate: "2026-11-04",
    isDraft: false,
    agencyName: agency.name,
    tripName: "رحلة عمرة الإسراء والمعراج المباركة — رجب 1448 هـ",
    tripDates: {
      start: "2026-12-10",
      end: "2026-12-22",
      nightsCount: 12,
    },
    expectedPilgrims: 45,
    exchangeRates: {
      sarToMad: 2.70,
      eurToMad: 10.85,
    },
    offerName: offerResult.offerName,
    pilgrimName: pilgrimCalc.pilgrimName,
    isIndividualQuote: true,
    roomCategory: "DOUBLE",
    hotelStaysBreakdown: [
      {
        hotelName: "فندق سويس أوتيل المقام مكة المكرمة المطل مباشرة على ساحات الحرم المكي الشريف",
        city: "MAKKAH",
        checkInDate: "2026-12-10",
        checkOutDate: "2026-12-17",
        nights: 7,
        isOverridden: false,
        singleDoubleRateSar: 1200,
        tripleRateSar: 1450,
        quadRateSar: 1700,
        fullRoomTotalSar: 8400,
        perPersonSar: 4200,
        perPersonMad: 11340,
      },
      {
        hotelName: "فندق شذا المدينة المنورة الفاخر بجوار الروضة الشريفة وباب السلام",
        city: "MADINAH",
        checkInDate: "2026-12-17",
        checkOutDate: "2026-12-22",
        nights: 5,
        isOverridden: false,
        singleDoubleRateSar: 850,
        tripleRateSar: 1050,
        quadRateSar: 1250,
        fullRoomTotalSar: 4250,
        perPersonSar: 2125,
        perPersonMad: 5737.5,
      },
    ],
    flightExpense: {
      amount: 8200,
      currency: "MAD",
      allocationType: "PER_PERSON",
      perPilgrimMad: 8200,
    },
    visaExpense: {
      perPilgrimSar: 525,
      perPilgrimMad: 1417.5,
      isHistoricalSnapshot: true,
    },
    groupBusExpense: {
      totalCostSar: 5400,
      pilgrimCount: 45,
      perPilgrimSar: 120,
      perPilgrimMad: 324,
      isMaintained: true,
    },
    trainExpenses: [
      {
        departureStation: "محطة مكة المكرمة (الرصيفة)",
        arrivalStation: "محطة قطار الحرمين السريع بالمدينة المنورة",
        ticketClass: "BUSINESS",
        ticketPriceSar: 350,
        passengerCount: 45,
        perPilgrimMad: 945,
        isIncluded: true,
      },
    ],
    individualCustomizations: [
      {
        type: "ADD_PRIVATE_TRANSPORT",
        description: "سيارة خاصة فاخرة GMC Yukon XL من مطار جدة إلى فندق مكة (مشاركة 3 معتمرين)",
        supplierCostDeltaMad: 540,
        isRecoverable: true,
      },
      {
        type: "ADD_SERVICE",
        description: "باقة تجوال وإنترنت غير محدود داخل المملكة مع شريحة 5G",
        supplierCostDeltaMad: 150,
        isRecoverable: true,
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
    multiRoomBreakdowns: offerResult.roomBreakdowns,
  });

  const customerHtml = renderCustomerQuotationHtml(customerQuotation);
  const internalHtml = renderInternalFinancialReportHtml(internalReport);

  const artifactsDir = "C:\\Users\\ALSAKB1\\.gemini\\antigravity\\brain\\5e7f9109-5ea6-4698-8817-897c4c5e00c5";
  const scratchDir = path.join(artifactsDir, "scratch");
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  console.log("\n1. Generating PDFs...");
  const customerPdf = await generatePdfFromHtml(customerHtml);
  const internalPdf = await generatePdfFromHtml(internalHtml);

  const customerPdfPath = path.join(scratchDir, "audit-realistic-customer-quotation.pdf");
  const internalPdfPath = path.join(scratchDir, "audit-realistic-internal-report.pdf");

  fs.writeFileSync(customerPdfPath, customerPdf);
  fs.writeFileSync(internalPdfPath, internalPdf);
  console.log(`✓ Saved Customer PDF: ${customerPdfPath} (${customerPdf.length} bytes)`);
  console.log(`✓ Saved Internal PDF: ${internalPdfPath} (${internalPdf.length} bytes)`);

  console.log("\n2. Launching Chromium to capture high-resolution visual screenshots...");
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // A4 width at 150 DPI = 1240px, height = 1754px
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

    // Render customer quotation screenshot
    await page.setContent(customerHtml, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");
    const customerImgPath = path.join(artifactsDir, "audit-customer-quotation.png");
    await page.screenshot({ path: customerImgPath, fullPage: true });
    console.log(`✓ Captured Customer Quotation Image: ${customerImgPath}`);

    // Render internal report screenshot
    await page.setContent(internalHtml, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");
    const internalImgPath = path.join(artifactsDir, "audit-internal-financial-report.png");
    await page.screenshot({ path: internalImgPath, fullPage: true });
    console.log(`✓ Captured Internal Financial Report Image: ${internalImgPath}`);

    console.log("\nVisual quality audit completed successfully!");
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
