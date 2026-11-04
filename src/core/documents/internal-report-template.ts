import { InternalFinancialReportData } from "../finance/types";
import { escapeHtml } from "./escape";

export function renderInternalFinancialReportHtml(data: InternalFinancialReportData): string {
  const {
    reportReference,
    generationDate,
    isDraft,
    isDeficit,
    deficitAmountMad,
    agencyName,
    tripName,
    tripDates,
    expectedPilgrims,
    exchangeRates,
    offerName,
    pilgrimName,
    isIndividualQuote,
    roomCategory,
    hotelStaysBreakdown,
    flightExpense,
    visaExpense,
    groupBusExpense,
    additionalTransports,
    trainExpenses,
    additionalServices,
    individualCustomizations,
    roomPricingSummary,
    multiRoomBreakdowns,
  } = data;

  const roomCategoryLabel = (cat: string) => {
    switch (cat) {
      case "SINGLE":
        return "غرفة فردية (1)";
      case "DOUBLE":
        return "غرفة ثنائية (2)";
      case "TRIPLE":
        return "غرفة ثلاثية (3)";
      case "QUAD":
        return "غرفة رباعية (4)";
      default:
        return cat;
    }
  };

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير التدقيق المالي الداخلي — ${reportReference}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm 15mm 15mm;
      @bottom-center {
        content: counter(page);
      }
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      direction: rtl;
      text-align: right;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 10pt;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }
    .page-container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 10px;
    }
    /* Header */
    .header {
      border-bottom: 2px solid #b91c1c;
      padding-bottom: 10px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .title-group {
      display: flex;
      flex-direction: column;
    }
    .report-title {
      font-size: 18pt;
      font-weight: 900;
      color: #7f1d1d;
      line-height: 1.1;
    }
    .confidential-badge {
      display: inline-block;
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 8.5pt;
      margin-top: 4px;
      width: fit-content;
    }
    .meta-box {
      text-align: left;
      font-size: 8.5pt;
      color: #334155;
    }
    .ref-val {
      font-weight: 800;
      color: #0f172a;
    }
    /* Deficit Banner */
    .deficit-banner {
      background: #ef4444;
      color: #ffffff;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 12px;
      font-size: 9.5pt;
      font-weight: 700;
    }
    /* Section Titles */
    .section-title {
      font-size: 10.5pt;
      font-weight: 800;
      color: #1e293b;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 3px;
      margin-top: 12px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 8.5pt;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      text-align: right;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      text-align: right;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .num-col {
      text-align: left;
      font-family: 'Segoe UI', Tahoma, sans-serif;
      font-weight: 600;
    }
    /* Financial Summary Highlight */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 8px;
      margin-bottom: 12px;
    }
    .summary-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px;
      background: #f8fafc;
      text-align: center;
    }
    .summary-card.highlight {
      background: #ecfdf5;
      border-color: #059669;
    }
    .summary-card.deficit {
      background: #fef2f2;
      border-color: #ef4444;
    }
    .summary-card-label {
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
    }
    .summary-card-val {
      font-size: 12pt;
      font-weight: 900;
      color: #0f172a;
      margin-top: 2px;
    }
    .summary-card-sub {
      font-size: 7.5pt;
      color: #64748b;
      margin-top: 1px;
    }
    /* Rates badge */
    .rates-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 8pt;
      display: flex;
      gap: 15px;
      margin-bottom: 10px;
    }
    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 12px;
      text-align: center;
      font-size: 7.5pt;
      color: #94a3b8;
    }
    @media print {
      body {
        margin: 0;
        background: transparent;
      }
      .page-container {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header -->
    <div class="header">
      <div class="title-group">
        <div class="report-title">تقرير التدقيق المالي الداخلي (Internal Financial Audit)</div>
        <div class="confidential-badge">سري للغاية • للاستخدام الإداري والمالي الداخلي فقط</div>
        <div style="font-size: 8.5pt; color: #475569; margin-top: 4px;">
          الوكالة: <strong>${escapeHtml(agencyName)}</strong> • الرحلة: <strong>${escapeHtml(tripName)}</strong> • الباقة: <strong>${escapeHtml(offerName)}</strong>
        </div>
      </div>
      <div class="meta-box">
        <div>مرجع التقرير: <span class="ref-val">${escapeHtml(reportReference)}</span></div>
        <div>تاريخ الإنشاء: <strong>${escapeHtml(generationDate)}</strong></div>
        <div>فئة الغرفة: <strong>${escapeHtml(roomCategoryLabel(roomCategory))}</strong></div>
        ${pilgrimName ? `<div>المعتمر: <strong style="color:#047857;">${escapeHtml(pilgrimName)}</strong></div>` : ""}
      </div>
    </div>

    <!-- Deficit Alert -->
    ${
      isDeficit
        ? `
      <div class="deficit-banner">
        ⚠️ تنبيه عجز مالي: سعر البيع النهائي أقل من التكلفة الفعلية للموردين! بمبلغ عجز: ${deficitAmountMad.toLocaleString()} درهم. يرجى مراجعة الخصومات أو هوامش الربح.
      </div>
    `
        : ""
    }

    <!-- Exchange Rates & Trip Parameters -->
    <div class="rates-box">
      <div>أسعار الصرف المعتمدة: SAR/MAD = <strong>${exchangeRates.sarToMad}</strong> | EUR/MAD = <strong>${exchangeRates.eurToMad}</strong></div>
      <div>حجم الفوج المتوقع: <strong>${expectedPilgrims} معتمر</strong></div>
      ${tripDates.start ? `<div>التواريخ: <strong>${escapeHtml(tripDates.start)} ➔ ${escapeHtml(tripDates.end)}</strong></div>` : ""}
    </div>

    <!-- 1. Hotel Accommodations Breakdown -->
    <div class="section-title">
      <span>1. الإقامة الفندقية وتكاليف الموردين (Hotel Accommodations)</span>
      <span style="font-size:8pt; font-weight:normal; color:#64748b;">(تسعير الغرفة الكاملة لليلة الواحدة)</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>الفندق</th>
          <th>المدينة</th>
          <th>الليالي</th>
          <th>سعر الغرفة/ليلة (SAR)</th>
          <th>إجمالي الغرفة (SAR)</th>
          <th>حصة المعتمر (SAR)</th>
          <th>حصة المعتمر (MAD)</th>
        </tr>
      </thead>
      <tbody>
        ${
          hotelStaysBreakdown.map((h) => {
            const nightlyRate =
              roomCategory === "SINGLE" || roomCategory === "DOUBLE"
                ? h.singleDoubleRateSar
                : roomCategory === "TRIPLE"
                ? h.tripleRateSar
                : h.quadRateSar;
            return `
            <tr>
              <td><strong>${escapeHtml(h.hotelName)}</strong> ${h.isOverridden ? '<span style="color:#b45309; font-size:7.5pt;">(معدل يدوياً)</span>' : ""}</td>
              <td>${escapeHtml(h.city)}</td>
              <td class="num-col">${h.nights}</td>
              <td class="num-col">${nightlyRate.toLocaleString()} ر.س</td>
              <td class="num-col">${h.fullRoomTotalSar.toLocaleString()} ر.س</td>
              <td class="num-col">${h.perPersonSar.toLocaleString()} ر.س</td>
              <td class="num-col" style="font-weight:700; color:#047857;">${h.perPersonMad.toLocaleString()} د.م.</td>
            </tr>
          `;
          }).join("")
        }
      </tbody>
    </table>

    <!-- 2. Transportation & Rail Breakdown -->
    <div class="section-title">
      <span>2. النقل والمواصلات وقطار الحرمين (Transportation & Train)</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>بند النقل</th>
          <th>المركبة / الدرجة</th>
          <th>التكلفة الإجمالية (SAR)</th>
          <th>المعتمرين</th>
          <th>حصة المعتمر (SAR)</th>
          <th>حصة المعتمر (MAD)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>حافلة المجموعة الأساسية</strong></td>
          <td>حافلة معتمرين</td>
          <td class="num-col">${groupBusExpense.totalCostSar.toLocaleString()} ر.س</td>
          <td class="num-col">${groupBusExpense.pilgrimCount}</td>
          <td class="num-col">${groupBusExpense.perPilgrimSar.toLocaleString()} ر.س</td>
          <td class="num-col" style="font-weight:700;">${groupBusExpense.perPilgrimMad.toLocaleString()} د.م.</td>
        </tr>
        ${
          additionalTransports && additionalTransports.length > 0
            ? additionalTransports
                .map(
                  (t) => `
          <tr>
            <td>${escapeHtml(t.routeName)}</td>
            <td>${escapeHtml(t.vehicleType)} (${t.capacity} ركاب)</td>
            <td class="num-col">${t.priceSar.toLocaleString()} ر.س</td>
            <td class="num-col">${t.allocatedPilgrims}</td>
            <td class="num-col">${t.perPilgrimSar.toLocaleString()} ر.س</td>
            <td class="num-col" style="font-weight:700;">${t.perPilgrimMad.toLocaleString()} د.م.</td>
          </tr>
        `
                )
                .join("")
            : ""
        }
        ${
          trainExpenses && trainExpenses.length > 0
            ? trainExpenses
                .map(
                  (tr) => `
          <tr>
            <td>قطار الحرمين: ${escapeHtml(tr.departureStation)} ➔ ${escapeHtml(tr.arrivalStation)}</td>
            <td>${tr.ticketClass === "BUSINESS" ? "درجة الأعمال" : "الدرجة الاقتصادية"}</td>
            <td class="num-col">${(tr.ticketPriceSar * tr.passengerCount).toLocaleString()} ر.س</td>
            <td class="num-col">${tr.passengerCount}</td>
            <td class="num-col">${tr.ticketPriceSar.toLocaleString()} ر.س</td>
            <td class="num-col" style="font-weight:700;">${tr.perPilgrimMad.toLocaleString()} د.م.</td>
          </tr>
        `
                )
                .join("")
            : ""
        }
      </tbody>
    </table>

    <!-- 3. Flights & Visas -->
    <div class="section-title">
      <span>3. الطيران والتأشيرات والخدمات المشتركة (Flights & Visas)</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>البند</th>
          <th>المبلغ الأصلي</th>
          <th>طريقة الاحتساب</th>
          <th>التكلفة بالدرهم للمعتمر (MAD)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>تذكرة الطيران الدولية</td>
          <td class="num-col">${flightExpense.amount.toLocaleString()} ${escapeHtml(flightExpense.currency)}</td>
          <td>${flightExpense.allocationType === "PER_PERSON" ? "فردي مباشر" : "طيران عارض مقسوم"}</td>
          <td class="num-col" style="font-weight:700;">${flightExpense.perPilgrimMad.toLocaleString()} د.م.</td>
        </tr>
        <tr>
          <td>تأشيرة العمرة والتأمين (حماية تاريخية)</td>
          <td class="num-col">${visaExpense.perPilgrimSar.toLocaleString()} SAR</td>
          <td>نسخة مجمدة في الرحلة</td>
          <td class="num-col" style="font-weight:700;">${visaExpense.perPilgrimMad.toLocaleString()} د.م.</td>
        </tr>
        ${
          additionalServices && additionalServices.length > 0
            ? additionalServices
                .map(
                  (s) => `
          <tr>
            <td>${escapeHtml(s.serviceName)}</td>
            <td class="num-col">${s.amount.toLocaleString()} ${escapeHtml(s.currency)}</td>
            <td>خدمة إضافية مشمولة</td>
            <td class="num-col" style="font-weight:700;">${s.perPilgrimMad.toLocaleString()} د.م.</td>
          </tr>
        `
                )
                .join("")
            : ""
        }
      </tbody>
    </table>

    <!-- 4. Individual Customizations (If any) -->
    ${
      individualCustomizations && individualCustomizations.length > 0
        ? `
      <div class="section-title">
        <span>4. بنود الاستثناءات والتخصيص الفردي للمعتمر (Individual Customizations)</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>نوع الاستثناء</th>
            <th>البيان والتفاصيل</th>
            <th>تغيير تكلفة المورد (MAD)</th>
            <th>ملاحظة الاسترداد</th>
          </tr>
        </thead>
        <tbody>
          ${individualCustomizations
            .map(
              (c) => `
            <tr>
              <td><strong>${escapeHtml(c.type)}</strong></td>
              <td>${escapeHtml(c.description)}</td>
              <td class="num-col" style="font-weight:bold; color:${c.supplierCostDeltaMad >= 0 ? "#b91c1c" : "#047857"};">
                ${c.supplierCostDeltaMad > 0 ? "+" : ""}${c.supplierCostDeltaMad.toLocaleString()} د.م.
              </td>
              <td>${c.isRecoverable !== false ? "مسترد / مضاف لتكلفة المورد" : "غير مسترد (يطبق كخصم تجاري)"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `
        : ""
    }

    <!-- 5. Central Financial Summary & Margin Engine -->
    <div class="section-title">
      <span>5. الملخص المالي وهوامش الأرباح المحققة (Financial Engine & Realized Profit)</span>
      <span style="font-size:8pt; font-weight:normal; color:#047857;">(مطابقة محرك Decimal.js بدون تقريب وسيط)</span>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-card-label">التكلفة الفعلية للموردين</div>
        <div class="summary-card-val">${roomPricingSummary.newActualCostMad.toLocaleString()} د.م.</div>
        <div class="summary-card-sub">
          الأصل: ${roomPricingSummary.baseActualCostMad.toLocaleString()} د.م.
          ${roomPricingSummary.netSupplierCostDeltaMad !== 0 ? ` (${roomPricingSummary.netSupplierCostDeltaMad > 0 ? "+" : ""}${roomPricingSummary.netSupplierCostDeltaMad.toLocaleString()})` : ""}
        </div>
      </div>

      <div class="summary-card">
        <div class="summary-card-label">هامش الربح المحدد</div>
        <div class="summary-card-val" style="color:#047857;">${roomPricingSummary.configuredProfitMad.toLocaleString()} د.م.</div>
        <div class="summary-card-sub">
          ${roomPricingSummary.isProfitOverridden ? "تعديل خاص للمعتمر" : "هامش الباقة المعتمد"}
        </div>
      </div>

      <div class="summary-card">
        <div class="summary-card-label">الخصم التجاري الممنوح</div>
        <div class="summary-card-val" style="color:#b45309;">${roomPricingSummary.commercialDiscountMad.toLocaleString()} د.م.</div>
        <div class="summary-card-sub">تخفيض من سعر البيع</div>
      </div>

      <div class="summary-card ${isDeficit ? "deficit" : "highlight"}">
        <div class="summary-card-label">سعر البيع النهائي الصافي</div>
        <div class="summary-card-val" style="color:${isDeficit ? "#dc2626" : "#047857"};">
          ${roomPricingSummary.finalSellingPriceMad.toLocaleString()} د.م.
        </div>
        <div class="summary-card-sub" style="font-weight:bold; color:${isDeficit ? "#dc2626" : "#047857"};">
          الربح المتبقي: ${roomPricingSummary.realizedProfitMad.toLocaleString()} د.م.
        </div>
      </div>
    </div>

    <!-- Multi-Room Summary for Base Offer -->
    ${
      multiRoomBreakdowns
        ? `
      <div class="section-title">
        <span>مقارنة فئات الغرف الأربع للباقة (Room Matrix Breakdown)</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>فئة الغرفة</th>
            <th>تكلفة الفندق (MAD)</th>
            <th>التكلفة الفعلية الإجمالية (MAD)</th>
            <th>الربح المحدد (MAD)</th>
            <th>سعر البيع النهائي (MAD)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>غرفة فردية (1)</strong></td>
            <td class="num-col">${Number(multiRoomBreakdowns.SINGLE.hotelCostMad).toLocaleString()} د.م.</td>
            <td class="num-col">${Number(multiRoomBreakdowns.SINGLE.totalActualCostMad).toLocaleString()} د.م.</td>
            <td class="num-col">${Number(multiRoomBreakdowns.SINGLE.configuredProfitMad).toLocaleString()} د.م.</td>
            <td class="num-col" style="font-weight:700; color:#047857;">${Number(multiRoomBreakdowns.SINGLE.finalSellingPriceMad).toLocaleString()} د.م.</td>
          </tr>
          <tr>
            <td><strong>غرفة ثنائية (2)</strong></td>
            <td class="num-col">${Number(multiRoomBreakdowns.DOUBLE.hotelCostMad).toLocaleString()} د.م.</td>
            <td class="num-col">${Number(multiRoomBreakdowns.DOUBLE.totalActualCostMad).toLocaleString()} د.م.</td>
            <td class="num-col">${Number(multiRoomBreakdowns.DOUBLE.configuredProfitMad).toLocaleString()} د.م.</td>
            <td class="num-col" style="font-weight:700; color:#047857;">${Number(multiRoomBreakdowns.DOUBLE.finalSellingPriceMad).toLocaleString()} د.م.</td>
          </tr>
          <tr>
            <td><strong>غرفة ثلاثية (3)</strong></td>
            <td class="num-col">${Number(multiRoomBreakdowns.TRIPLE.hotelCostMad).toLocaleString()} د.م.</td>
            <td class="num-col">${Number(multiRoomBreakdowns.TRIPLE.totalActualCostMad).toLocaleString()} د.م.</td>
            <td class="num-col">${Number(multiRoomBreakdowns.TRIPLE.configuredProfitMad).toLocaleString()} د.م.</td>
            <td class="num-col" style="font-weight:700; color:#047857;">${Number(multiRoomBreakdowns.TRIPLE.finalSellingPriceMad).toLocaleString()} د.م.</td>
          </tr>
          <tr>
            <td><strong>غرفة رباعية (4)</strong></td>
            <td class="num-col">${Number(multiRoomBreakdowns.QUAD.hotelCostMad).toLocaleString()} د.م.</td>
            <td class="num-col">${Number(multiRoomBreakdowns.QUAD.totalActualCostMad).toLocaleString()} د.م.</td>
            <td class="num-col">${Number(multiRoomBreakdowns.QUAD.configuredProfitMad).toLocaleString()} د.م.</td>
            <td class="num-col" style="font-weight:700; color:#047857;">${Number(multiRoomBreakdowns.QUAD.finalSellingPriceMad).toLocaleString()} د.م.</td>
          </tr>
        </tbody>
      </table>
    `
        : ""
    }

    <!-- Footer -->
    <div class="footer">
      <div>تقرير تدقيق مالي صادر آلياً من منصة مَثابة لإدارة العمرة • Mathaba Umrah Manager</div>
      <div style="color:#ef4444; font-weight:600; margin-top:2px;">تحذير سرية: يمنع مشاركة هذه الوثيقة أو أرقام التكاليف مع المعتمرين أو جهات خارجية.</div>
    </div>
  </div>
</body>
</html>`;
}
