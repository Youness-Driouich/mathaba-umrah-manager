import { CustomerFacingQuotation } from "../finance/types";
import { escapeHtml } from "./escape";

export function renderCustomerQuotationHtml(
  quotation: CustomerFacingQuotation,
  overrideLang?: "ar" | "fr"
): string {
  const lang = overrideLang || quotation.documentLanguage || "ar";
  const isFr = lang === "fr";

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
        return isFr ? "Chambre individuelle (1 pèlerin)" : "غرفة فردية (1 معتمر)";
      case "DOUBLE":
        return isFr ? "Chambre double (2 pèlerins)" : "غرفة ثنائية (معتمران)";
      case "TRIPLE":
        return isFr ? "Chambre triple (3 pèlerins)" : "غرفة ثلاثية (3 معتمرين)";
      case "QUAD":
        return isFr ? "Chambre quadruple (4 pèlerins)" : "غرفة رباعية (4 معتمرين)";
      default:
        return cat;
    }
  };

  const cityLabel = (city: string) => {
    switch (city) {
      case "MAKKAH":
        return isFr ? "La Mecque" : "مكة المكرمة";
      case "MADINAH":
        return isFr ? "Médine" : "المدينة المنورة";
      case "JEDDAH":
        return isFr ? "Djeddah" : "جدة";
      default:
        return city;
    }
  };

  const formatNumber = (num: number) => {
    if (isFr) {
      return num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const currencyUnit = isFr ? "Dirhams Marocains (MAD)" : "درهم مغربي (MAD)";

  return `<!DOCTYPE html>
<html lang="${isFr ? "fr" : "ar"}" dir="${isFr ? "ltr" : "rtl"}">
<head>
  <meta charset="UTF-8">
  <title>${isFr ? `Devis Omra — ${escapeHtml(referenceNumber)}` : `عرض سعر رحلة العمرة — ${escapeHtml(referenceNumber)}`}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
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
    .header {
      border-bottom: 2.5px solid #047857;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 19pt;
      font-weight: 900;
      color: #064e3b;
      letter-spacing: -0.3px;
      line-height: 1.15;
    }
    .brand-subtitle {
      font-size: 8.5pt;
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
      text-align: ${isFr ? "right" : "left"};
      font-size: 8.5pt;
      color: #334155;
    }
    .ref-badge {
      display: inline-block;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 3px 9px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 9pt;
      margin-bottom: 4px;
    }
    .welcome-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 9.5pt;
      color: #14532d;
      line-height: 1.5;
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
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 9pt;
    }
    th {
      background: #f8fafc;
      color: #1e293b;
      font-weight: 700;
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      text-align: ${isFr ? "left" : "right"};
    }
    td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:nth-child(even) td {
      background: #fcfdfe;
    }
    .service-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 14px;
      margin-bottom: 14px;
      font-size: 9pt;
    }
    .service-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      color: #1e293b;
    }
    .check-icon {
      color: #059669;
      font-weight: 900;
      flex-shrink: 0;
    }
    .customization-badge {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 9pt;
      color: #92400e;
    }
    .price-card {
      background: #064e3b;
      color: #ffffff;
      border-radius: 10px;
      padding: 16px 20px;
      margin-top: 18px;
      margin-bottom: 18px;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .price-label {
      font-size: 10pt;
      color: #a7f3d0;
      font-weight: 600;
      margin-bottom: 4px;
      letter-spacing: 0.2px;
    }
    .price-value {
      font-size: 24pt;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .price-subtext {
      font-size: 8.5pt;
      color: #cbd5e1;
      margin-top: 4px;
    }
    .terms-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-top: 14px;
      font-size: 8.5pt;
      color: #475569;
    }
    .terms-card h4 {
      margin: 0 0 6px 0;
      font-size: 9pt;
      font-weight: 700;
      color: #1e293b;
    }
    .terms-card ol {
      margin: 0;
      padding-${isFr ? "left" : "right"}: 16px;
    }
    .terms-card li {
      margin-bottom: 3px;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 20px;
      padding-top: 10px;
      text-align: center;
      font-size: 7.5pt;
      color: #94a3b8;
      line-height: 1.4;
    }
    @media print {
      body {
        background: #ffffff !important;
        font-size: 10pt !important;
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
        <div class="brand-title">${escapeHtml(agencyName)}</div>
        <div class="brand-subtitle">${isFr ? "Organisation de Voyages Omra & Hajj" : "MATHABA UMRAH & TRAVEL SERVICES"}</div>
        <div class="agency-contact">
          ${agencyPhone ? `${isFr ? "Tél" : "الهاتف / الواتساب"}: ${escapeHtml(agencyPhone)} | ` : ""}
          ${agencyEmail ? `${isFr ? "Email" : "البريد الإلكتروني"}: ${escapeHtml(agencyEmail)}` : ""}
          ${agencyAddress ? `<br>${isFr ? "Adresse" : "المقر"}: ${escapeHtml(agencyAddress)}` : ""}
        </div>
      </div>
      <div class="meta-box">
        <div class="ref-badge">${isFr ? "Réf" : "مرجع"}: ${escapeHtml(referenceNumber)}</div>
        <div>${isFr ? "Date d'émission" : "تاريخ الإصدار"}: <strong>${escapeHtml(issueDate)}</strong></div>
        ${tripStartDate ? `<div>${isFr ? "Période" : "فترة السفر"}: ${escapeHtml(tripStartDate)}${tripEndDate ? ` ${isFr ? "au" : "إلى"} ${escapeHtml(tripEndDate)}` : ""}</div>` : ""}
      </div>
    </header>

    <!-- Welcome & Context Card -->
    <div class="welcome-card">
      ${isFr
        ? `L'agence <strong>${escapeHtml(agencyName)}</strong> a le plaisir de vous soumettre ce devis officiel pour le voyage béni d'Omra : <strong>${escapeHtml(tripName)}</strong> (${escapeHtml(offerName)}).`
        : `يسر <strong>${escapeHtml(agencyName)}</strong> أن تقدم ${pilgrimName ? `للمعتمر الكريم <strong>${escapeHtml(pilgrimName)}</strong>` : "لحضرتكم"} عرض السعر المخصص لرحلة العمرة المباركة: <strong>${escapeHtml(tripName)}</strong> — ${escapeHtml(offerName)}.`
      }
      ${pilgrimName && isFr ? `<br><strong>Pèlerin titulaire :</strong> ${escapeHtml(pilgrimName)}` : ""}
      ${contactPhone ? ` | ${isFr ? "Contact" : "الهاتف"}: ${escapeHtml(contactPhone)}` : ""}
    </div>

    <!-- Section 1: Hotel Accommodations -->
    <div class="section-title">
      <span>🏨 ${isFr ? "Hébergements Hôteliers à La Mecque et Médine" : "الإقامة الفندقية في مكة المكرمة والمدينة المنورة"}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>${isFr ? "Hôtel" : "الفندق"}</th>
          <th>${isFr ? "Ville & Destination" : "المدينة والوجهة"}</th>
          <th style="text-align: center;">${isFr ? "Nuits" : "عدد الليالي"}</th>
          <th>${isFr ? "Catégorie de chambre" : "فئة الغرفة المختارة"}</th>
        </tr>
      </thead>
      <tbody>
        ${hotelStays.map((stay) => `
          <tr>
            <td style="font-weight: 600; color: #0f172a;">${escapeHtml(stay.hotelName)}</td>
            <td>${cityLabel(stay.city)}</td>
            <td style="text-align: center;">${stay.nights} ${isFr ? "nuits" : "ليالٍ"}</td>
            <td>${roomCategoryLabel(roomCategory)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <!-- Section 2: Transportation & Train -->
    <div class="section-title">
      <span>🚆 ${isFr ? "Transports et Déplacements Inclus" : "خدمات النقل والمواصلات المشمولة في الباقة"}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>${isFr ? "Trajet / Prestation" : "المسار / الخدمة"}</th>
          <th>${isFr ? "Type de véhicule" : "نوع النقل"}</th>
          <th>${isFr ? "Détails & Avantages" : "التفاصيل والمزايا"}</th>
        </tr>
      </thead>
      <tbody>
        ${transportServices.map((t) => `
          <tr>
            <td style="font-weight: 600;">${escapeHtml(t.routeName)}</td>
            <td>${escapeHtml(t.vehicleType || (isFr ? "Autocar Grand Tourisme" : "حافلة المجموعة الحديثة"))}</td>
            <td>${escapeHtml(t.description)}</td>
          </tr>
        `).join("")}
        ${trainJourneys && trainJourneys.length > 0 ? trainJourneys.map((tr) => `
          <tr>
            <td style="font-weight: 600;">${isFr ? "TGV Haramain" : "قطار الحرمين السريع"}: ${escapeHtml(tr.departureStation)} ➔ ${escapeHtml(tr.arrivalStation)}</td>
            <td><span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 8pt;">${tr.ticketClass === "BUSINESS" ? (isFr ? "Classe Affaires" : "درجة رجال الأعمال") : (isFr ? "Classe Économique" : "الدرجة الاقتصادية")}</span></td>
            <td>${isFr ? "Liaison rapide et confortable entre les deux Saintes Mosquées" : "رحلة سريعة ومريحة لخدمة ضيوف الرحمن"}</td>
          </tr>
        `).join("") : ""}
      </tbody>
    </table>

    <!-- Section 3: Included Services -->
    <div class="section-title">
      <span>✨ ${isFr ? "Prestations et Services Inclus dans le Forfait" : "الخدمات الإضافية والمزايا المشمولة"}</span>
    </div>
    <div class="service-grid">
      ${includedServices.map((srv) => `
        <div class="service-item">
          <span class="check-icon">✓</span>
          <span>${escapeHtml(srv)}</span>
        </div>
      `).join("")}
    </div>

    <!-- Section 4: Individual Customizations if present -->
    ${customizationDescriptions && customizationDescriptions.length > 0 ? `
      <div class="section-title">
        <span>⭐ ${isFr ? "Options et Personnalisations Choisies" : "الترقيات والخيارات الفردية المضافة"}</span>
      </div>
      <div class="customization-badge">
        <ul style="margin: 0; padding-${isFr ? "left" : "right"}: 16px;">
          ${customizationDescriptions.map((desc) => `
            <li>${escapeHtml(desc)}</li>
          `).join("")}
        </ul>
      </div>
    ` : ""}

    <!-- Section 5: Official Selling Price -->
    <div class="price-card">
      <div class="price-label">
        ${isFr
          ? `Tarif officiel et prix de vente final net (${roomCategoryLabel(roomCategory)})`
          : `السعر الرسمي الصافي المعتمد للمعتمر (${roomCategoryLabel(roomCategory)})`
        }
      </div>
      <div class="price-value">
        ${formatNumber(finalSellingPriceMad)} <span style="font-size: 16pt; font-weight: 700;">${currencyUnit}</span>
      </div>
      <div class="price-subtext">
        ${isFr
          ? "Tarif tout compris (Hébergements, Transports, Visas, Taxes applicables au Maroc et en Arabie Saoudite)"
          : "السعر شامل لجميع الإقامات والتنقلات وتأشيرة العمرة والتأمين الصحي والضرائب الموضحة أعلاه"
        }
      </div>
    </div>

    <!-- Section 6: Multi-room pricing matrix if baseline offer -->
    ${!isIndividualQuote && roomMatrixPrices ? `
      <div class="section-title">
        <span>📋 ${isFr ? "Grille Tarifaire Complète par Catégorie de Chambre" : "جدول الأسعار لجميع فئات الغرف المتاحة بالباقة"}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>${isFr ? "Catégorie de chambre" : "فئة الغرفة"}</th>
            <th style="text-align: center;">${isFr ? "Occupation" : "عدد المعتمرين"}</th>
            <th style="text-align: ${isFr ? "right" : "left"};">${isFr ? "Prix par pèlerin" : "السعر للمعتمر الواحد"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${isFr ? "Chambre quadruple (4 lits)" : "غرفة رباعية (4 أسرة)"}</td>
            <td style="text-align: center;">4</td>
            <td style="font-weight: 800; text-align: ${isFr ? "right" : "left"}; color: #047857;">${formatNumber(roomMatrixPrices.QUAD)} ${isFr ? "MAD" : "د.م."}</td>
          </tr>
          <tr>
            <td>${isFr ? "Chambre triple (3 lits)" : "غرفة ثلاثية (3 أسرة)"}</td>
            <td style="text-align: center;">3</td>
            <td style="font-weight: 800; text-align: ${isFr ? "right" : "left"}; color: #047857;">${formatNumber(roomMatrixPrices.TRIPLE)} ${isFr ? "MAD" : "د.م."}</td>
          </tr>
          <tr>
            <td>${isFr ? "Chambre double (2 lits)" : "غرفة ثنائية (سريران)"}</td>
            <td style="text-align: center;">2</td>
            <td style="font-weight: 800; text-align: ${isFr ? "right" : "left"}; color: #047857;">${formatNumber(roomMatrixPrices.DOUBLE)} ${isFr ? "MAD" : "د.م."}</td>
          </tr>
          <tr>
            <td>${isFr ? "Chambre individuelle (1 lit)" : "غرفة فردية (سرير واحد)"}</td>
            <td style="text-align: center;">1</td>
            <td style="font-weight: 800; text-align: ${isFr ? "right" : "left"}; color: #047857;">${formatNumber(roomMatrixPrices.SINGLE)} ${isFr ? "MAD" : "د.م."}</td>
          </tr>
        </tbody>
      </table>
    ` : ""}

    <!-- Terms and Conditions -->
    <div class="terms-card">
      <h4>${isFr ? "Conditions Générales & Validité du Devis" : "شروط وضوابط العرض:"}</h4>
      <ol>
        ${termsAndConditions.map((t) => `
          <li>${escapeHtml(t)}</li>
        `).join("")}
      </ol>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <div>${documentFooterText ? escapeHtml(documentFooterText) : (isFr ? "Agence Mathaba Voyages — Agréée officiellement par le Ministère du Tourisme et le Ministère du Hajj et de la Omra." : "وكالة مَثابة مرخصة رسمياً ومعتمدة لخدمة ضيوف الرحمن.")}</div>
      <div style="margin-top: 3px;">Mathaba Umrah Manager • ${isFr ? "Document officiel de tarification généré automatiquement" : "وثيقة تسعير رسمية صادرة آلياً"}</div>
    </footer>
  </div>
</body>
</html>`;
}
