import { InternalFinancialReportData } from "../finance/types";
import { escapeHtml } from "./escape";

export function renderInternalFinancialReportHtml(
  data: InternalFinancialReportData,
  overrideLang?: "ar" | "fr",
  overrideIncludeMargins?: boolean
): string {
  const lang = overrideLang || data.documentLanguage || "ar";
  const isFr = lang === "fr";
  const includeMargins = overrideIncludeMargins !== undefined ? overrideIncludeMargins : (data.includeMargins ?? false);

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
        return isFr ? "Chambre individuelle (1)" : "غرفة فردية (1)";
      case "DOUBLE":
        return isFr ? "Chambre double (2)" : "غرفة ثنائية (2)";
      case "TRIPLE":
        return isFr ? "Chambre triple (3)" : "غرفة ثلاثية (3)";
      case "QUAD":
        return isFr ? "Chambre quadruple (4)" : "غرفة رباعية (4)";
      default:
        return cat;
    }
  };

  const formatNumber = (num: number) => {
    if (isFr) {
      return num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const currencyUnit = isFr ? "MAD" : "د.م.";
  const sarUnit = isFr ? "SAR" : "ر.س";

  // Document Title
  const documentTitle = includeMargins
    ? (isFr ? "État Détaillé des Coûts & Audit Financier Interne" : "بيان التكلفة والتدقيق المالي الداخلي")
    : (isFr ? "État Détaillé des Coûts (Internal Cost Statement)" : "بيان التكلفة (Internal Cost Statement)");

  const badgeText = includeMargins
    ? (isFr ? "Strictement Confidentiel — Direction & Gestion Interne" : "سري للغاية — للاستخدام الإداري والمالي الداخلي فقط")
    : (isFr ? "Document Financier Agréé — Gestion & Partenaires Autorisés" : "بيان تكلفة معتمد — للإدارة والشراكات المعتمدة");

  return `<!DOCTYPE html>
<html lang="${isFr ? "fr" : "ar"}" dir="${isFr ? "ltr" : "rtl"}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(documentTitle)} — ${escapeHtml(reportReference)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
      @bottom-center {
        content: counter(page);
      }
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: ${isFr ? "'Inter', system-ui, -apple-system, sans-serif" : "'Cairo', 'Segoe UI', Tahoma, sans-serif"};
      direction: ${isFr ? "ltr" : "rtl"};
      text-align: ${isFr ? "left" : "right"};
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 9.5pt;
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
    .header {
      border-bottom: 2px solid ${includeMargins ? "#b91c1c" : "#047857"};
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .report-title {
      font-size: 16pt;
      font-weight: 900;
      color: ${includeMargins ? "#7f1d1d" : "#064e3b"};
      line-height: 1.15;
    }
    .badge {
      display: inline-block;
      background: ${includeMargins ? "#fef2f2" : "#ecfdf5"};
      color: ${includeMargins ? "#b91c1c" : "#065f46"};
      border: 1px solid ${includeMargins ? "#fecaca" : "#a7f3d0"};
      padding: 2.5px 7px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 8pt;
      margin-top: 3px;
      width: fit-content;
    }
    .meta-box {
      text-align: ${isFr ? "right" : "left"};
      font-size: 8pt;
      color: #334155;
    }
    .ref-val {
      font-weight: 800;
      color: #0f172a;
    }
    .rates-bar {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 12px;
      margin-bottom: 12px;
      font-size: 8.5pt;
      color: #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    .section-title {
      font-size: 10pt;
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
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 8.5pt;
    }
    th {
      background: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      text-align: ${isFr ? "left" : "right"};
    }
    td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .cost-card-grid {
      display: grid;
      grid-template-columns: ${includeMargins ? "repeat(4, 1fr)" : "repeat(3, 1fr)"};
      gap: 8px;
      margin-top: 10px;
      margin-bottom: 12px;
    }
    .cost-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
    }
    .cost-card.highlight {
      background: #ecfdf5;
      border-color: #10b981;
      color: #065f46;
    }
    .cost-card.profit {
      background: #f0fdf4;
      border-color: #22c55e;
      color: #15803d;
    }
    .cost-card.discount {
      background: #fffbeb;
      border-color: #f59e0b;
      color: #b45309;
    }
    .cost-card-title {
      font-size: 8pt;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 3px;
    }
    .cost-card-value {
      font-size: 13pt;
      font-weight: 900;
      color: #0f172a;
    }
    .deficit-banner {
      background: #ef4444;
      color: #ffffff;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
      font-size: 9pt;
      font-weight: 700;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 14px;
      padding-top: 8px;
      text-align: center;
      font-size: 7pt;
      color: #94a3b8;
    }
    @media print {
      body {
        background: #ffffff !important;
        font-size: 9pt !important;
      }
      .page-container {
        padding: 0 !important;
        max-width: 100% !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header -->
    <header class="header">
      <div>
        <div class="report-title">${escapeHtml(documentTitle)}</div>
        <div class="badge">${escapeHtml(badgeText)}</div>
        <div style="font-size: 8pt; color: #64748b; margin-top: 4px;">
          ${escapeHtml(agencyName)} • ${escapeHtml(tripName)} • ${escapeHtml(offerName)}
        </div>
      </div>
      <div class="meta-box">
        <div>${isFr ? "Réf" : "مرجع التقرير"}: <span class="ref-val">${escapeHtml(reportReference)}</span></div>
        <div>${isFr ? "Date d'édition" : "تاريخ الإنشاء"}: ${escapeHtml(generationDate)}</div>
        <div>${isFr ? "Catégorie" : "فئة الغرفة"}: <strong>${roomCategoryLabel(roomCategory)}</strong></div>
        ${pilgrimName ? `<div>${isFr ? "Pèlerin" : "المعتمر"}: <strong style="color: #047857;">${escapeHtml(pilgrimName)}</strong></div>` : ""}
      </div>
    </header>

    <!-- Deficit Banner if present and margins enabled -->
    ${includeMargins && isDeficit ? `
      <div class="deficit-banner">
        ⚠️ ${isFr
          ? `ALERTE DÉFICIT : Le prix de vente actuel est inférieur aux coûts réels fournisseurs. Déficit net : -${formatNumber(deficitAmountMad)} MAD.`
          : `تنبيه عجز مالي: سعر البيع النهائي أقل من التكلفة الفعلية للموردين! العجز المحقق: -${formatNumber(deficitAmountMad)} د.م.`
        }
      </div>
    ` : ""}

    <!-- Context & Rates Bar -->
    <div class="rates-bar">
      <div><strong>${isFr ? "Période" : "التواريخ"}:</strong> ${escapeHtml(tripDates.start)} ➔ ${escapeHtml(tripDates.end)}</div>
      <div><strong>${isFr ? "Taux de change" : "أسعار الصرف"}:</strong> SAR/MAD = ${exchangeRates.sarToMad} | EUR/MAD = ${exchangeRates.eurToMad}</div>
      <div><strong>${isFr ? "Groupe attendu" : "حجم الفوج المتوقع"}:</strong> ${expectedPilgrims} ${isFr ? "pèlerins" : "معتمر"}</div>
    </div>

    <!-- Section 1: Hotel Accommodations -->
    <div class="section-title">
      <span>1. ${isFr ? "Hébergements Hôteliers et Tarifs Fournisseurs (Hotel Accommodations)" : "الإقامة الفندقية وتكاليف الموردين (Hotel Accommodations)"}</span>
      <span style="font-size: 7.5pt; font-weight: normal; color: #64748b;">${isFr ? "(Tarifs contractuels par chambre / nuit)" : "(تسعير الغرفة الكاملة لليلة الواحدة)"}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>${isFr ? "Hôtel" : "الفندق"}</th>
          <th>${isFr ? "Ville" : "المدينة"}</th>
          <th style="text-align: center;">${isFr ? "Nuits" : "الليالي"}</th>
          <th style="text-align: right;">${isFr ? "Chambre/nuit (SAR)" : "سعر الغرفة/ليلة (SAR)"}</th>
          <th style="text-align: right;">${isFr ? "Total SAR" : "إجمالي الغرفة (SAR)"}</th>
          <th style="text-align: right;">${isFr ? "Part pèlerin (SAR)" : "حصة المعتمر (SAR)"}</th>
          <th style="text-align: right; background: #e2e8f0; font-weight: 800;">${isFr ? "Coût pèlerin (MAD)" : "حصة المعتمر (MAD)"}</th>
        </tr>
      </thead>
      <tbody>
        ${hotelStaysBreakdown.map((h) => {
          let nightlyRate = h.singleDoubleRateSar;
          if (roomCategory === "TRIPLE") nightlyRate = h.tripleRateSar;
          if (roomCategory === "QUAD") nightlyRate = h.quadRateSar;
          return `
            <tr>
              <td style="font-weight: 600;">${escapeHtml(h.hotelName)}</td>
              <td>${escapeHtml(h.city)}</td>
              <td style="text-align: center;">${h.nights}</td>
              <td style="text-align: right;">${formatNumber(nightlyRate)} ${sarUnit}</td>
              <td style="text-align: right;">${formatNumber(h.fullRoomTotalSar)} ${sarUnit}</td>
              <td style="text-align: right;">${formatNumber(h.perPersonSar)} ${sarUnit}</td>
              <td style="text-align: right; font-weight: 700; color: #047857; background: #f0fdf4;">${formatNumber(h.perPersonMad)} ${currencyUnit}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>

    <!-- Section 2: Transportation & Train -->
    <div class="section-title">
      <span>2. ${isFr ? "Transports et TGV Haramain (Transportation & Train)" : "النقل والمواصلات وقطار الحرمين (Transportation & Train)"}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>${isFr ? "Prestation" : "بند النقل"}</th>
          <th>${isFr ? "Véhicule / Classe" : "المركبة / الدرجة"}</th>
          <th style="text-align: right;">${isFr ? "Coût total (SAR)" : "التكلفة الإجمالية (SAR)"}</th>
          <th style="text-align: center;">${isFr ? "Pèlerins" : "المعتمرين"}</th>
          <th style="text-align: right;">${isFr ? "Part / pèlerin (SAR)" : "حصة المعتمر (SAR)"}</th>
          <th style="text-align: right; background: #e2e8f0; font-weight: 800;">${isFr ? "Coût pèlerin (MAD)" : "حصة المعتمر (MAD)"}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: 600;">${isFr ? "Autocar du groupe (Base du forfait)" : "حافلة المجموعة الأساسية"}</td>
          <td>${isFr ? "Autocar Tourisme" : "حافلة معتمرين"}</td>
          <td style="text-align: right;">${formatNumber(groupBusExpense.totalCostSar)} ${sarUnit}</td>
          <td style="text-align: center;">${groupBusExpense.pilgrimCount}</td>
          <td style="text-align: right;">${formatNumber(groupBusExpense.perPilgrimSar)} ${sarUnit}</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatNumber(groupBusExpense.perPilgrimMad)} ${currencyUnit}</td>
        </tr>
        ${trainExpenses.map((tr) => `
          <tr>
            <td style="font-weight: 600;">${isFr ? "TGV Haramain" : "قطار الحرمين"}: ${escapeHtml(tr.departureStation)} ➔ ${escapeHtml(tr.arrivalStation)}</td>
            <td>${tr.ticketClass === "BUSINESS" ? (isFr ? "Affaires" : "درجة رجال الأعمال") : (isFr ? "Économique" : "الدرجة الاقتصادية")}</td>
            <td style="text-align: right;">${formatNumber(tr.ticketPriceSar * tr.passengerCount)} ${sarUnit}</td>
            <td style="text-align: center;">${tr.passengerCount}</td>
            <td style="text-align: right;">${formatNumber(tr.ticketPriceSar)} ${sarUnit}</td>
            <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatNumber(tr.perPilgrimMad)} ${currencyUnit}</td>
          </tr>
        `).join("")}
        ${additionalTransports.map((at) => `
          <tr>
            <td style="font-weight: 600;">${escapeHtml(at.routeName)}</td>
            <td>${escapeHtml(at.vehicleType)} (${at.vehicleCount}x)</td>
            <td style="text-align: right;">${formatNumber(at.priceSar)} ${sarUnit}</td>
            <td style="text-align: center;">${at.allocatedPilgrims}</td>
            <td style="text-align: right;">${formatNumber(at.perPilgrimSar)} ${sarUnit}</td>
            <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatNumber(at.perPilgrimMad)} ${currencyUnit}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <!-- Section 3: Flights & Visas -->
    <div class="section-title">
      <span>3. ${isFr ? "Vols Internationaux et Visas (Flights & Visas)" : "الطيران والتأشيرات والخدمات المشتركة (Flights & Visas)"}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>${isFr ? "Prestation" : "البند"}</th>
          <th>${isFr ? "Montant Contractuel" : "المبلغ الأصلي"}</th>
          <th>${isFr ? "Mode d'allocation" : "طريقة الاحتساب"}</th>
          <th style="text-align: right; background: #e2e8f0; font-weight: 800;">${isFr ? "Coût au pèlerin (MAD)" : "التكلفة بالدرهم للمعتمر (MAD)"}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: 600;">${isFr ? "Billet d'avion international" : "تذكرة الطيران الدولية"}</td>
          <td>${flightExpense.currency} ${formatNumber(flightExpense.amount)}</td>
          <td>${flightExpense.allocationType === "PER_PERSON" ? (isFr ? "Par pèlerin" : "فردي مباشر") : (isFr ? "Partagé sur groupe" : "إجمالي مقسم")}</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatNumber(flightExpense.perPilgrimMad)} ${currencyUnit}</td>
        </tr>
        <tr>
          <td style="font-weight: 600;">${isFr ? "Frais de visa Omra et assurance" : "تأشيرة العمرة والتأمين الصحي"}</td>
          <td>SAR ${formatNumber(visaExpense.perPilgrimSar)}</td>
          <td>${visaExpense.isHistoricalSnapshot ? (isFr ? "Instantané historique gelé" : "نسخة مجمدة في الرحلة") : (isFr ? "Taux actuel" : "حالي")}</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatNumber(visaExpense.perPilgrimMad)} ${currencyUnit}</td>
        </tr>
      </tbody>
    </table>

    <!-- Section 4: Individual Customizations if applicable -->
    ${individualCustomizations && individualCustomizations.length > 0 ? `
      <div class="section-title">
        <span>4. ${isFr ? "Ajustements et Personnalisations Individuelles (Individual Customizations)" : "بنود الاستثناءات والتخصيص الفردي للمعتمر (Individual Customizations)"}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>${isFr ? "Type" : "نوع الاستثناء"}</th>
            <th>${isFr ? "Détails & Prestations" : "البيان والتفاصيل"}</th>
            <th style="text-align: right;">${isFr ? "Évolution Coût Fournisseur (MAD)" : "تغيير تكلفة المورد (MAD)"}</th>
            <th>${isFr ? "Observation" : "ملاحظة الاسترداد"}</th>
          </tr>
        </thead>
        <tbody>
          ${individualCustomizations.map((c) => `
            <tr>
              <td><span style="font-weight: 700; color: #b45309; background: #fef3c7; padding: 2px 5px; border-radius: 4px; font-size: 7.5pt;">${escapeHtml(c.type)}</span></td>
              <td>${escapeHtml(c.description)}</td>
              <td style="text-align: right; font-weight: 700; color: ${c.supplierCostDeltaMad >= 0 ? "#b91c1c" : "#047857"};">
                ${c.supplierCostDeltaMad >= 0 ? "+" : ""}${formatNumber(c.supplierCostDeltaMad)} ${currencyUnit}
              </td>
              <td style="font-size: 8pt; color: #64748b;">${isFr ? "Imputé au coût réel fournisseur" : "مسترد / مضاف للتكلفة الفعلية"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : ""}

    <!-- Section 5: Financial Summary -->
    <div class="section-title">
      <span>5. ${includeMargins
        ? (isFr ? "Synthèse Financière & Marges Réalisées (Financial Engine & Realized Profit)" : "الملخص المالي وهوامش الأرباح المحققة (Financial Engine & Realized Profit)")
        : (isFr ? "Synthèse des Coûts Réels Fournisseurs (Actual Supplier Costs Statement)" : "ملخص التكاليف الفعلية المباشرة للموردين (Actual Supplier Costs)")
      }</span>
      <span style="font-size: 7.5pt; color: #047857; font-weight: bold;">${isFr ? "Calculs certifiés Decimal.js sans arrondi intermédiaire" : "مطابقة محرك Decimal.js بدون تقريب وسيط"}</span>
    </div>

    ${includeMargins ? `
      <!-- Full Executive Mode: Margins, Discounts, Selling Prices Included -->
      <div class="cost-card-grid">
        <div class="cost-card">
          <div class="cost-card-title">${isFr ? "Coût réel fournisseur" : "التكلفة الفعلية للموردين"}</div>
          <div class="cost-card-value">${formatNumber(roomPricingSummary.newActualCostMad)} <span style="font-size: 9pt;">${currencyUnit}</span></div>
          <div style="font-size: 7pt; color: #64748b; margin-top: 2px;">
            ${isFr ? "Base" : "الأصل"}: ${formatNumber(roomPricingSummary.baseActualCostMad)} (${roomPricingSummary.netSupplierCostDeltaMad >= 0 ? "+" : ""}${formatNumber(roomPricingSummary.netSupplierCostDeltaMad)})
          </div>
        </div>

        <div class="cost-card">
          <div class="cost-card-title">${isFr ? "Marge bénéficiaire cible" : "هامش الربح المحدد"}</div>
          <div class="cost-card-value" style="color: #047857;">+${formatNumber(roomPricingSummary.configuredProfitMad)} <span style="font-size: 9pt;">${currencyUnit}</span></div>
          <div style="font-size: 7pt; color: #64748b; margin-top: 2px;">${isFr ? "Marge forfaitaire" : "هامش الباقة المعتمد"}</div>
        </div>

        <div class="cost-card discount">
          <div class="cost-card-title" style="color: #92400e;">${isFr ? "Remise commerciale" : "الخصم التجاري الممنوح"}</div>
          <div class="cost-card-value" style="color: #b45309;">${formatNumber(roomPricingSummary.commercialDiscountMad)} <span style="font-size: 9pt;">${currencyUnit}</span></div>
          <div style="font-size: 7pt; color: #92400e; margin-top: 2px;">${isFr ? "Concession commerciale" : "تخفيض من سعر البيع"}</div>
        </div>

        <div class="cost-card highlight">
          <div class="cost-card-title" style="color: #065f46;">${isFr ? "Prix de vente final net" : "سعر البيع النهائي الصافي"}</div>
          <div class="cost-card-value" style="color: #064e3b;">${formatNumber(roomPricingSummary.finalSellingPriceMad)} <span style="font-size: 9pt;">${currencyUnit}</span></div>
          <div style="font-size: 7.5pt; font-weight: 700; color: ${roomPricingSummary.realizedProfitMad >= 0 ? "#047857" : "#b91c1c"}; margin-top: 2px;">
            ${isFr ? "Bénéfice net" : "الربح المتبقي"}: ${formatNumber(roomPricingSummary.realizedProfitMad)} ${currencyUnit}
          </div>
        </div>
      </div>
    ` : `
      <!-- Shareable Mode: Margins Hidden by Default -->
      <div class="cost-card-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="cost-card">
          <div class="cost-card-title">${isFr ? "Coût de base hébergement & services" : "تكلفة الإقامة والخدمات الأساسية"}</div>
          <div class="cost-card-value">${formatNumber(roomPricingSummary.baseActualCostMad)} <span style="font-size: 9pt;">${currencyUnit}</span></div>
          <div style="font-size: 7pt; color: #64748b; margin-top: 2px;">${isFr ? "Hors options individuelles" : "قبل الترقيات الإضافية"}</div>
        </div>

        <div class="cost-card">
          <div class="cost-card-title">${isFr ? "Ajustements & transports spécifiques" : "إضافات الترقية والنقل الخاص"}</div>
          <div class="cost-card-value" style="color: ${roomPricingSummary.netSupplierCostDeltaMad >= 0 ? "#b45309" : "#047857"};">
            ${roomPricingSummary.netSupplierCostDeltaMad >= 0 ? "+" : ""}${formatNumber(roomPricingSummary.netSupplierCostDeltaMad)} <span style="font-size: 9pt;">${currencyUnit}</span>
          </div>
          <div style="font-size: 7pt; color: #64748b; margin-top: 2px;">${isFr ? "Frais réels fournisseurs répercutés" : "صافي تكاليف الموردين المباشرة"}</div>
        </div>

        <div class="cost-card highlight">
          <div class="cost-card-title" style="color: #065f46;">${isFr ? "Total Coût Réel Fournisseur" : "إجمالي التكلفة الفعلية للموردين"}</div>
          <div class="cost-card-value" style="color: #064e3b;">${formatNumber(roomPricingSummary.newActualCostMad)} <span style="font-size: 9pt;">${currencyUnit}</span></div>
          <div style="font-size: 7.5pt; font-weight: 700; color: #047857; margin-top: 2px;">
            ${isFr ? "Coût net fournisseur par pèlerin" : "صافي تكلفة التنفيذ للمعتمر"}
          </div>
        </div>
      </div>
    `}

    <!-- Section 6: Room Matrix Comparison -->
    ${multiRoomBreakdowns ? `
      <div class="section-title">
        <span>6. ${isFr ? "Comparatif des Coûts par Catégorie de Chambre (Room Matrix)" : "مقارنة فئات الغرف الأربع للباقة (Room Matrix Breakdown)"}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>${isFr ? "Catégorie" : "فئة الغرفة"}</th>
            <th style="text-align: right;">${isFr ? "Coût Hôtel (MAD)" : "تكلفة الفندق (MAD)"}</th>
            <th style="text-align: right;">${isFr ? "Coût Réel Fournisseur (MAD)" : "التكلفة الفعلية الإجمالية (MAD)"}</th>
            ${includeMargins ? `
              <th style="text-align: right;">${isFr ? "Marge (MAD)" : "الربح المحدد (MAD)"}</th>
              <th style="text-align: right; background: #e2e8f0; font-weight: 800;">${isFr ? "Prix de Vente (MAD)" : "سعر البيع النهائي (MAD)"}</th>
            ` : ""}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${isFr ? "Chambre individuelle (1)" : "غرفة فردية (1)"}</td>
            <td style="text-align: right;">${formatNumber(multiRoomBreakdowns.SINGLE.hotelCostMad.toNumber())} ${currencyUnit}</td>
            <td style="text-align: right; font-weight: 700;">${formatNumber(multiRoomBreakdowns.SINGLE.totalActualCostMad.toNumber())} ${currencyUnit}</td>
            ${includeMargins ? `
              <td style="text-align: right;">${formatNumber(multiRoomBreakdowns.SINGLE.configuredProfitMad.toNumber())} ${currencyUnit}</td>
              <td style="text-align: right; font-weight: 800; color: #047857; background: #f0fdf4;">${formatNumber(multiRoomBreakdowns.SINGLE.finalSellingPriceMad.toNumber())} ${currencyUnit}</td>
            ` : ""}
          </tr>
          <tr>
            <td>${isFr ? "Chambre double (2)" : "غرفة ثنائية (2)"}</td>
            <td style="text-align: right;">${formatNumber(multiRoomBreakdowns.DOUBLE.hotelCostMad.toNumber())} ${currencyUnit}</td>
            <td style="text-align: right; font-weight: 700;">${formatNumber(multiRoomBreakdowns.DOUBLE.totalActualCostMad.toNumber())} ${currencyUnit}</td>
            ${includeMargins ? `
              <td style="text-align: right;">${formatNumber(multiRoomBreakdowns.DOUBLE.configuredProfitMad.toNumber())} ${currencyUnit}</td>
              <td style="text-align: right; font-weight: 800; color: #047857; background: #f0fdf4;">${formatNumber(multiRoomBreakdowns.DOUBLE.finalSellingPriceMad.toNumber())} ${currencyUnit}</td>
            ` : ""}
          </tr>
          <tr>
            <td>${isFr ? "Chambre triple (3)" : "غرفة ثلاثية (3)"}</td>
            <td style="text-align: right;">${formatNumber(multiRoomBreakdowns.TRIPLE.hotelCostMad.toNumber())} ${currencyUnit}</td>
            <td style="text-align: right; font-weight: 700;">${formatNumber(multiRoomBreakdowns.TRIPLE.totalActualCostMad.toNumber())} ${currencyUnit}</td>
            ${includeMargins ? `
              <td style="text-align: right;">${formatNumber(multiRoomBreakdowns.TRIPLE.configuredProfitMad.toNumber())} ${currencyUnit}</td>
              <td style="text-align: right; font-weight: 800; color: #047857; background: #f0fdf4;">${formatNumber(multiRoomBreakdowns.TRIPLE.finalSellingPriceMad.toNumber())} ${currencyUnit}</td>
            ` : ""}
          </tr>
          <tr>
            <td>${isFr ? "Chambre quadruple (4)" : "غرفة رباعية (4)"}</td>
            <td style="text-align: right;">${formatNumber(multiRoomBreakdowns.QUAD.hotelCostMad.toNumber())} ${currencyUnit}</td>
            <td style="text-align: right; font-weight: 700;">${formatNumber(multiRoomBreakdowns.QUAD.totalActualCostMad.toNumber())} ${currencyUnit}</td>
            ${includeMargins ? `
              <td style="text-align: right;">${formatNumber(multiRoomBreakdowns.QUAD.configuredProfitMad.toNumber())} ${currencyUnit}</td>
              <td style="text-align: right; font-weight: 800; color: #047857; background: #f0fdf4;">${formatNumber(multiRoomBreakdowns.QUAD.finalSellingPriceMad.toNumber())} ${currencyUnit}</td>
            ` : ""}
          </tr>
        </tbody>
      </table>
    ` : ""}

    <!-- Footer -->
    <footer class="footer">
      <div>${isFr ? "Mathaba Umrah Manager • Document financier certifié conforme édité automatiquement." : "تقرير مالي صادر آلياً من منصة مَثابة لإدارة العمرة • مطابقة تامة مع الحسابات المعتمدة."}</div>
      <div style="color: ${includeMargins ? "#b91c1c" : "#64748b"}; font-weight: 700; margin-top: 2px;">
        ${includeMargins
          ? (isFr ? "STRICTEMENT CONFIDENTIEL : Ce document contient des informations sur les marges et coûts internes réservées à la direction." : "تحذير سرية: تحتوي هذه النسخة على هوامش الأرباح وتكاليف الموردين الداخلية الخاصة بالإدارة.")
          : (isFr ? "Document financier partageable avec les partenaires autorisés. Les marges et prix de vente sont masqués par défaut." : "مستند بيان تكلفة مخصص للشراكات والإدارة. تفاصيل وهوامش الأرباح مخفية تلقائياً.")
        }
      </div>
    </footer>
  </div>
</body>
</html>`;
}
