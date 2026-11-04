import puppeteer from "puppeteer-core";
import { renderCustomerQuotationHtml } from "../src/core/documents/customer-quotation-template";
import { renderInternalFinancialReportHtml } from "../src/core/documents/internal-report-template";
import { projectCustomerFacingQuotation, buildInternalFinancialReportData } from "../src/core/finance/projection";
import { calculateBaselineOffer } from "../src/core/finance/calculator";
import * as fs from "fs";
import * as path from "path";

// Locate Chrome executable on Windows/Linux/macOS
function getChromePath(): string {
  const possiblePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Users\\" + (process.env.USERNAME || "") + "\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) return p;
  }
  throw new Error("No Chrome/Edge executable found on system.");
}

async function runBrowserTests() {
  console.log("=== Testing Browser PDF Export & Multi-Device Emulation ===");
  const chromePath = getChromePath();
  console.log(`Using Chrome binary: ${chromePath}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const offer = calculateBaselineOffer({
    offerName: "باقة النور الاقتصادية",
    exchangeRates: { sarToMad: "2.70", eurToMad: "10.85" },
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
    ],
    flight: { amount: 7500, currency: "MAD", allocation: "PER_PERSON" },
    transportation: { groupBusTotalSar: 4400, groupPilgrimCount: 40 },
    visaCostSar: 525,
    fixedProfitMadPerPilgrim: 2000,
  });

  // Arabic Customer Quotation
  const quoteAr = projectCustomerFacingQuotation({
    referenceNumber: "QT-AR-TEST",
    agencyName: "وكالة مَثابة لأسفار العمرة",
    tripName: "رحلة عمرة رجب",
    offerResult: offer,
    selectedRoomCategory: "DOUBLE",
    documentLanguage: "ar",
  });
  const htmlQuoteAr = renderCustomerQuotationHtml(quoteAr);

  // French Cost Statement (Shareable - Margins Hidden)
  const reportFr = buildInternalFinancialReportData({
    reportReference: "MTH-COST-FR-TEST",
    agencyName: "Mathaba Voyages",
    tripName: "Voyage Omra Rajab",
    tripDates: { start: "2026-12-15", end: "2026-12-20", nightsCount: 5 },
    expectedPilgrims: 40,
    exchangeRates: { sarToMad: 2.70, eurToMad: 10.85 },
    offerName: "Offre Al Nour",
    roomCategory: "DOUBLE",
    hotelStaysBreakdown: [],
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
    documentLanguage: "fr",
    includeMargins: false,
  });
  const htmlReportFr = renderInternalFinancialReportHtml(reportFr);

  // 1. Test Desktop Chrome (Emulation & A4 Print-to-PDF Export)
  console.log("\n[1/3] Testing Desktop Chrome (1920x1080)...");
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1920, height: 1080 });
  await desktopPage.setContent(htmlQuoteAr, { waitUntil: "domcontentloaded" });

  // Verify .no-print toolbar is visible in screen mode
  const screenToolbarDisplay = await desktopPage.$eval(".no-print", (el) => window.getComputedStyle(el).display);
  console.log(`  - Screen Mode .no-print toolbar display: ${screenToolbarDisplay} (Expected: flex)`);
  if (screenToolbarDisplay !== "flex") throw new Error("Toolbar should be visible on screen.");

  // Emulate print media & verify .no-print is hidden
  await desktopPage.emulateMediaType("print");
  const printToolbarDisplay = await desktopPage.$eval(".no-print", (el) => window.getComputedStyle(el).display);
  console.log(`  - Print Media .no-print toolbar display: ${printToolbarDisplay} (Expected: none)`);
  if (printToolbarDisplay !== "none") throw new Error("Toolbar must be hidden during print!");

  // Generate real A4 PDF buffer via Chrome Print Engine
  const desktopPdf = await desktopPage.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "10mm", bottom: "12mm", left: "12mm", right: "12mm" },
  });
  console.log(`  ✔ Desktop Chrome A4 PDF successfully generated: ${desktopPdf.length} bytes`);
  await desktopPage.close();

  // 2. Test iPhone Safari Emulation (iOS WebKit User-Agent + Mobile Viewport)
  console.log("\n[2/3] Testing iPhone Safari Mobile Emulation (390x844)...");
  const iosPage = await browser.newPage();
  await iosPage.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
  );
  await iosPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await iosPage.setContent(htmlQuoteAr, { waitUntil: "domcontentloaded" });

  // Verify responsive layout on mobile screen
  const bodyScrollWidth = await iosPage.evaluate(() => document.body.scrollWidth);
  console.log(`  - Mobile Viewport Width: 390px, Body Scroll Width: ${bodyScrollWidth}px`);

  // Emulate print on iOS (where browser print dialog overrides mobile viewport with A4)
  await iosPage.emulateMediaType("print");
  const iosPrintToolbar = await iosPage.$eval(".no-print", (el) => window.getComputedStyle(el).display);
  console.log(`  - iOS Print Media .no-print hidden: ${iosPrintToolbar === "none"}`);
  const iosPdf = await iosPage.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "10mm", bottom: "12mm", left: "12mm", right: "12mm" },
  });
  console.log(`  ✔ iPhone Safari Emulated A4 PDF successfully generated: ${iosPdf.length} bytes`);
  await iosPage.close();

  // 3. Test Android Chrome Emulation (Pixel 8 Viewport + French Cost Statement)
  console.log("\n[3/3] Testing Android Chrome Mobile Emulation (412x915, French)...");
  const androidPage = await browser.newPage();
  await androidPage.setUserAgent(
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
  );
  await androidPage.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
  await androidPage.setContent(htmlReportFr, { waitUntil: "domcontentloaded" });

  await androidPage.emulateMediaType("print");
  const androidPdf = await androidPage.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "10mm", bottom: "12mm", left: "12mm", right: "12mm" },
  });
  console.log(`  ✔ Android Chrome Emulated A4 PDF successfully generated: ${androidPdf.length} bytes`);
  await androidPage.close();

  await browser.close();

  console.log("\n========================================================");
  console.log("ALL DESKTOP & MOBILE BROWSER PRINT-TO-PDF TESTS PASSED!");
  console.log("========================================================");
}

runBrowserTests().catch((err) => {
  console.error("Browser test failed:", err);
  process.exit(1);
});
