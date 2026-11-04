import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

// Locate Chrome or Edge executable on Windows
export function getBrowserExecutablePath(): string {
  const possiblePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  throw new Error("Neither Google Chrome nor Microsoft Edge was found on this system.");
}

async function testPdf() {
  const exePath = getBrowserExecutablePath();
  console.log(`Found browser at: ${exePath}`);

  const browser = await puppeteer.launch({
    executablePath: exePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();

  const sampleHtml = `
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <title>اختبار عرض السعر العربي</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      @page {
        size: A4;
        margin: 15mm;
      }
      body {
        font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
        direction: rtl;
        text-align: right;
        margin: 0;
        padding: 0;
        color: #1e293b;
        background: #ffffff;
      }
      .header {
        border-bottom: 2px solid #047857;
        padding-bottom: 12px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .title {
        font-size: 24px;
        font-weight: 800;
        color: #064e3b;
      }
      .badge {
        background: #ecfdf5;
        color: #065f46;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: bold;
        font-size: 13px;
        border: 1px solid #a7f3d0;
      }
      .price-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 16px;
        margin-top: 20px;
        text-align: center;
      }
      .price-val {
        font-size: 28px;
        font-weight: 900;
        color: #047857;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
      }
      th {
        background: #f1f5f9;
        color: #475569;
        padding: 10px;
        font-size: 13px;
        border: 1px solid #cbd5e1;
        text-align: right;
      }
      td {
        padding: 10px;
        font-size: 13px;
        border: 1px solid #e2e8f0;
        text-align: right;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="title">مَثابة لإدارة العمرة — Mathaba Umrah Services</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">عرض سعر باقة عمرة رسمية • مرجع: MTH-2026-TEST</div>
      </div>
      <div class="badge">معتمد رسمياً</div>
    </div>

    <p style="font-size: 14px; line-height: 1.8;">
      يسر وكالة <strong>مَثابة للأسفار</strong> أن تقدم للمعتمر الكريم <strong>الحاج محمد القادري</strong> هذا العرض المخصص لرحلة العمرة المباركة لشهر رجب 1448هـ / ديسمبر 2026م.
    </p>

    <table>
      <thead>
        <tr>
          <th>الخدمة / الإقامة</th>
          <th>المدينة والوجهة</th>
          <th>الليالي</th>
          <th>حالة الشمول</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>فندق برج الساعة الملكي (غرفة ثنائية)</td>
          <td>مكة المكرمة</td>
          <td>10 ليالٍ</td>
          <td>مشمول في السعر</td>
        </tr>
        <tr>
          <td>فندق دار التقوى (غرفة ثنائية)</td>
          <td>المدينة المنورة</td>
          <td>5 ليالٍ</td>
          <td>مشمول في السعر</td>
        </tr>
        <tr>
          <td>تأشيرة العمرة الإلكترونية والتأمين</td>
          <td>المملكة العربية السعودية</td>
          <td>-</td>
          <td>مشمول في السعر</td>
        </tr>
        <tr>
          <td>نقل خاص بسيارة عائلية فاخرة (GMC)</td>
          <td>مطار جدة ➔ فندق مكة</td>
          <td>-</td>
          <td>مشمول ومخصص</td>
        </tr>
      </tbody>
    </table>

    <div class="price-box">
      <div style="font-size: 13px; color: #64748b;">سعر البيع النهائي للمعتمر (شامل جميع الخدمات والضرائب)</div>
      <div class="price-val">22,754.50 درهم مغربي (MAD)</div>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">سعر نهائي صافٍ غير خاضع لأي مصاريف إضافية غير معلنة</div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(sampleHtml, { waitUntil: "load" });

  const outputPdfPath = path.join(process.cwd(), "test-sample-arabic.pdf");
  await page.pdf({
    path: outputPdfPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "15mm",
      bottom: "15mm",
      left: "15mm",
      right: "15mm",
    },
  });

  await browser.close();
  console.log(`PDF successfully generated at: ${outputPdfPath}`);
  const stats = fs.statSync(outputPdfPath);
  console.log(`PDF file size: ${stats.size} bytes`);
}

testPdf().catch((err) => {
  console.error("Test PDF failed:", err);
  process.exit(1);
});
