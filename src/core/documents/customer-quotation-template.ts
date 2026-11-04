import { CustomerFacingQuotation } from "../finance/types";
import { escapeHtml } from "./escape";

export function renderCustomerQuotationHtml(quotation: CustomerFacingQuotation): string {
  const {
    referenceNumber,
    issueDate,
    agencyName,
    agencyPhone,
    agencyEmail,
    agencyAddress,
    documentFooterText,
    tripName,
    tripStartDate,
    tripEndDate,
    offerName,
    pilgrimName,
    contactPhone,
    isIndividualQuote,
    isDraft,
    roomCategory,
    roomMatrixPrices,
    hotelStays,
    flightDetails,
    transportServices,
    trainJourneys,
    includedServices,
    customizationDescriptions,
    finalSellingPriceMad,
    termsAndConditions,
  } = quotation;

  const roomCategoryLabel = (cat: string) => {
    switch (cat) {
      case "SINGLE":
        return "غرفة فردية (1 معتمر)";
      case "DOUBLE":
        return "غرفة ثنائية (معتمران)";
      case "TRIPLE":
        return "غرفة ثلاثية (3 معتمرين)";
      case "QUAD":
        return "غرفة رباعية (4 معتمرين)";
      default:
        return cat;
    }
  };

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>عرض سعر رحلة العمرة — ${referenceNumber}</title>
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
      font-size: 11pt;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .page-container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 10px;
    }
    /* Header Branding */
    .header {
      border-bottom: 2.5px solid #047857;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 20pt;
      font-weight: 900;
      color: #064e3b;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .brand-subtitle {
      font-size: 9pt;
      color: #047857;
      font-weight: 700;
      margin-top: 2px;
      text-transform: uppercase;
    }
    .agency-contact {
      font-size: 8.5pt;
      color: #475569;
      margin-top: 5px;
      line-height: 1.4;
    }
    .meta-box {
      text-align: left;
      font-size: 8.5pt;
      color: #334155;
    }
    .ref-badge {
      display: inline-block;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 10pt;
      margin-bottom: 4px;
    }
    .draft-badge {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 9pt;
      display: inline-block;
      margin-top: 2px;
    }
    /* Pilgrim Greeting */
    .intro-banner {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      font-size: 9.5pt;
      color: #166534;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      color: #064e3b;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 14px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9pt;
    }
    th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      padding: 7px 9px;
      border: 1px solid #cbd5e1;
      text-align: right;
    }
    td {
      padding: 7px 9px;
      border: 1px solid #e2e8f0;
      text-align: right;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #fcfcfc;
    }
    /* Matrix Price Cards */
    .matrix-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 10px;
      margin-bottom: 14px;
    }
    .matrix-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 9px;
      text-align: center;
      background: #ffffff;
    }
    .matrix-card.selected {
      border-color: #059669;
      background: #f0fdf4;
    }
    .matrix-card-title {
      font-size: 9pt;
      font-weight: 700;
      color: #475569;
    }
    .matrix-card-price {
      font-size: 13pt;
      font-weight: 900;
      color: #064e3b;
      margin-top: 3px;
    }
    .matrix-card-cur {
      font-size: 7.5pt;
      color: #047857;
      font-weight: 600;
    }
    /* Final Selling Price Callout */
    .price-callout {
      background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
      color: #ffffff;
      border-radius: 10px;
      padding: 14px;
      text-align: center;
      margin: 14px 0;
    }
    .price-callout-label {
      font-size: 9.5pt;
      color: #a7f3d0;
      font-weight: 600;
    }
    .price-callout-val {
      font-size: 22pt;
      font-weight: 900;
      color: #ffffff;
      margin: 3px 0;
    }
    .price-callout-sub {
      font-size: 8pt;
      color: #d1fae5;
    }
    /* Lists */
    .feature-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 12px;
      margin: 6px 0;
      padding: 0;
      list-style: none;
      font-size: 8.5pt;
    }
    .feature-item {
      position: relative;
      padding-right: 14px;
      color: #334155;
    }
    .feature-item::before {
      content: "✓";
      position: absolute;
      right: 0;
      color: #059669;
      font-weight: 900;
    }
    /* Terms */
    .terms-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 9px 12px;
      font-size: 8pt;
      color: #64748b;
      line-height: 1.6;
      margin-top: 10px;
    }
    .terms-box ol {
      margin: 4px 0;
      padding-right: 18px;
    }
    /* Footer */
    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 14px;
      text-align: center;
      font-size: 7.5pt;
      color: #64748b;
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
      <div>
        <div class="brand-title">${escapeHtml(agencyName)}</div>
        <div class="brand-subtitle">Mathaba Umrah & Travel Services</div>
        <div class="agency-contact">
          ${agencyPhone ? `<div>الهاتف / الواتساب: <span dir="ltr">${escapeHtml(agencyPhone)}</span></div>` : ""}
          ${agencyEmail ? `<div>البريد الإلكتروني: <span dir="ltr">${escapeHtml(agencyEmail)}</span></div>` : ""}
          ${agencyAddress ? `<div>المقر: ${escapeHtml(agencyAddress)}</div>` : ""}
        </div>
      </div>
      <div class="meta-box">
        <div class="ref-badge">مرجع: ${escapeHtml(referenceNumber)}</div>
        <div>تاريخ الإصدار: <strong>${escapeHtml(issueDate)}</strong></div>
        ${isDraft ? `<div class="draft-badge">مسودة تسعيرة (Draft)</div>` : ""}
      </div>
    </div>

    <!-- Intro Greeting -->
    <div class="intro-banner">
      ${
        pilgrimName
          ? `يسر وكالة <strong>${escapeHtml(agencyName)}</strong> أن تقدم للمعتمر الكريم <strong>${escapeHtml(pilgrimName)}</strong> عرض السعر المخصص لرحلة العمرة المباركة: <strong>${escapeHtml(tripName)}</strong>.`
          : `يسر وكالة <strong>${escapeHtml(agencyName)}</strong> أن تقدم لكم هذا العرض الرسمي لرحلة العمرة المباركة: <strong>${escapeHtml(tripName)}</strong> (${escapeHtml(offerName)}).`
      }
      ${
        tripStartDate && tripEndDate
          ? `<span style="display:block; margin-top:2px;">فترة السفر: من <strong>${escapeHtml(tripStartDate)}</strong> إلى <strong>${escapeHtml(tripEndDate)}</strong>.</span>`
          : ""
      }
    </div>

    <!-- 1. Hotel Accommodations -->
    <div class="section-title">
      <span>🏢</span>
      <span>الإقامة الفندقية في مكة المكرمة والمدينة المنورة</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>الفندق</th>
          <th>المدينة والوجهة</th>
          <th>عدد الليالي</th>
          <th>فئة الغرفة المختارة</th>
        </tr>
      </thead>
      <tbody>
        ${
          hotelStays.length > 0
            ? hotelStays
                .map(
                  (s) => `
          <tr>
            <td><strong>${escapeHtml(s.hotelName)}</strong></td>
            <td>${s.city === "MAKKAH" ? "مكة المكرمة" : s.city === "MADINAH" ? "المدينة المنورة" : escapeHtml(s.city)}</td>
            <td>${escapeHtml(s.nights)} ليالٍ</td>
            <td>${escapeHtml(roomCategoryLabel(roomCategory))}</td>
          </tr>
        `
                )
                .join("")
            : `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">سيتم تحديد الفندق حسب تواريخ الحجز المعتمدة</td></tr>`
        }
      </tbody>
    </table>

    <!-- 2. Transportation & Trains -->
    <div class="section-title">
      <span>🚌</span>
      <span>خدمات النقل والمواصلات المشمولة في الباقة</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>المسار / الخدمة</th>
          <th>نوع النقل</th>
          <th>التفاصيل والمزايا</th>
        </tr>
      </thead>
      <tbody>
        ${
          transportServices && transportServices.length > 0
            ? transportServices
                .map(
                  (t) => `
          <tr>
            <td><strong>${escapeHtml(t.routeName)}</strong></td>
            <td>${t.isPrivate ? `<span style="color:#047857; font-weight:bold;">نقل خاص VIP (${escapeHtml(t.vehicleType || "سيارة")})</span>` : "حافلة المجموعة الحديثة"}</td>
            <td>${escapeHtml(t.description)}</td>
          </tr>
        `
                )
                .join("")
            : `<tr><td>حافلات حديثة ومكيفة</td><td>نقل جماعي</td><td>تنقلات متكاملة بين المطارات والفنادق والمزارات</td></tr>`
        }
        ${
          trainJourneys && trainJourneys.length > 0
            ? trainJourneys
                .map(
                  (tr) => `
          <tr>
            <td><strong>قطار الحرمين السريع: ${escapeHtml(tr.departureStation)} ➔ ${escapeHtml(tr.arrivalStation)}</strong></td>
            <td>قطار فائق السرعة (${tr.ticketClass === "BUSINESS" ? "درجة الأعمال VIP" : "الدرجة الاقتصادية"})</td>
            <td>رحلة سريعة ومريحة لخدمة ضيوف الرحمن</td>
          </tr>
        `
                )
                .join("")
            : ""
        }
      </tbody>
    </table>

    <!-- 3. Included Services -->
    <div class="section-title">
      <span>✨</span>
      <span>الخدمات الإضافية والمزايا المشمولة</span>
    </div>
    <ul class="feature-list">
      ${includedServices.map((srv) => `<li class="feature-item">${escapeHtml(srv)}</li>`).join("")}
      ${
        flightDetails?.flightIncluded
          ? `<li class="feature-item">تذكرة الطيران الدولية (${escapeHtml(flightDetails.airlineName || "شركة طيران دولية معتمدة")})</li>`
          : ""
      }
      ${
        customizationDescriptions && customizationDescriptions.length > 0
          ? customizationDescriptions.map((c) => `<li class="feature-item" style="color:#047857; font-weight:700;">${escapeHtml(c)}</li>`).join("")
          : ""
      }
    </ul>

    <!-- 4. Pricing -->
    <div class="section-title">
      <span>🏷️</span>
      <span>التسعيرة الرسمية وسعر البيع النهائي</span>
    </div>

    ${
      !isIndividualQuote && roomMatrixPrices
        ? `
      <!-- Multi-Room Category Matrix for Base Offer -->
      <div class="matrix-grid">
        <div class="matrix-card ${roomCategory === "QUAD" ? "selected" : ""}">
          <div class="matrix-card-title">غرفة رباعية (4)</div>
          <div class="matrix-card-price">${roomMatrixPrices.QUAD.toLocaleString()}</div>
          <div class="matrix-card-cur">درهم / للمعتمر</div>
        </div>
        <div class="matrix-card ${roomCategory === "TRIPLE" ? "selected" : ""}">
          <div class="matrix-card-title">غرفة ثلاثية (3)</div>
          <div class="matrix-card-price">${roomMatrixPrices.TRIPLE.toLocaleString()}</div>
          <div class="matrix-card-cur">درهم / للمعتمر</div>
        </div>
        <div class="matrix-card ${roomCategory === "DOUBLE" ? "selected" : ""}">
          <div class="matrix-card-title">غرفة ثنائية (2)</div>
          <div class="matrix-card-price">${roomMatrixPrices.DOUBLE.toLocaleString()}</div>
          <div class="matrix-card-cur">درهم / للمعتمر</div>
        </div>
        <div class="matrix-card ${roomCategory === "SINGLE" ? "selected" : ""}">
          <div class="matrix-card-title">غرفة فردية (1)</div>
          <div class="matrix-card-price">${roomMatrixPrices.SINGLE.toLocaleString()}</div>
          <div class="matrix-card-cur">درهم / للمعتمر</div>
        </div>
      </div>
    `
        : `
      <!-- Single Individual Pilgrim Price Box -->
      <div class="price-callout">
        <div class="price-callout-label">سعر البيع النهائي الصافي للمعتمر (${escapeHtml(roomCategoryLabel(roomCategory))})</div>
        <div class="price-callout-val">${finalSellingPriceMad.toLocaleString()} درهم مغربي (MAD)</div>
        <div class="price-callout-sub">السعر شامل لجميع الإقامات والتنقلات والتأشيرات والضرائب الموضحة أعلاه</div>
      </div>
    `
    }

    <!-- 5. Terms & Conditions -->
    <div class="terms-box">
      <strong>شروط وضوابط العرض:</strong>
      <ol>
        ${termsAndConditions.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
      </ol>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>${escapeHtml(documentFooterText || "شركة مثابة لخدمات العمرة والأسفار — معتمدون من وزارة السياحة والأوقاف")}</div>
      <div style="margin-top:2px; color:#94a3b8;">وثيقة تسعير رسمية صادرة آلياً • Mathaba Umrah Manager</div>
    </div>
  </div>
</body>
</html>`;
}
