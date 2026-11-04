"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Printer,
  Download,
  FileText,
  ShieldAlert,
  RefreshCw,
  ExternalLink,
  Eye,
  Check,
  Languages,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { RoomCategory } from "@prisma/client";

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType?: "offer" | "quote";
  targetType?: "offer" | "quote";
  entityId?: string;
  targetId?: string;
  defaultDocType?: "quotation" | "internal-report" | "internal_report";
  initialDocType?: "quotation" | "internal-report" | "internal_report";
  defaultRoomCategory?: RoomCategory;
  initialRoomCategory?: RoomCategory;
  pilgrimName?: string;
  offerName?: string;
}

export function DocumentViewerModal({
  isOpen,
  onClose,
  entityType,
  targetType,
  entityId,
  targetId,
  defaultDocType,
  initialDocType,
  defaultRoomCategory,
  initialRoomCategory,
  pilgrimName,
  offerName,
}: DocumentViewerModalProps) {
  const resolvedEntityType = entityType || targetType || "offer";
  const resolvedEntityId = entityId || targetId || "";
  const rawDocType = defaultDocType || initialDocType || "quotation";
  const normalizedDocType: "quotation" | "internal-report" =
    rawDocType === "internal_report" ? "internal-report" : (rawDocType as "quotation" | "internal-report");
  const resolvedRoomCategory = defaultRoomCategory || initialRoomCategory || RoomCategory.DOUBLE;

  const [docType, setDocType] = useState<"quotation" | "internal-report">(normalizedDocType);
  const [docLanguage, setDocLanguage] = useState<"ar" | "fr">("ar");
  const [includeMargins, setIncludeMargins] = useState<boolean>(false); // default: false for shareable cost statements!
  const [roomCategory, setRoomCategory] = useState<RoomCategory>(resolvedRoomCategory);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getEndpoint = (format: "html" | "pdf" | "json") => {
    const base = resolvedEntityType === "offer" ? `/api/documents/offers/${resolvedEntityId}` : `/api/documents/quotes/${resolvedEntityId}`;
    const docPath = docType === "quotation" ? "quotation" : "internal-report";
    const params = new URLSearchParams({
      format,
      lang: docLanguage,
      includeMargins: includeMargins ? "true" : "false",
    });
    if (resolvedEntityType === "offer") {
      params.set("roomCategory", roomCategory);
    }
    return `${base}/${docPath}?${params.toString()}`;
  };

  const fetchDocumentHtml = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = getEndpoint("html");
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load document");
      }
      const html = await res.text();
      setHtmlContent(html);
    } catch (err: any) {
      setError(err.message || "Failed to load document preview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && resolvedEntityId) {
      fetchDocumentHtml();
    }
  }, [isOpen, resolvedEntityId, docType, roomCategory, docLanguage, includeMargins]);

  // High-fidelity native browser print-to-PDF with mobile-safe handling
  const handlePrint = () => {
    const isMobile =
      typeof navigator !== "undefined" &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // On iOS Safari and Android Chrome, opening in a new dedicated tab
      // allows the native print spooler / PDF save sheet to render properly without iframe clipping
      window.open(getEndpoint("html"), "_blank");
      return;
    }

    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (e) {
        console.warn("Iframe print invocation failed, falling back to window.open", e);
      }
    }

    const printWindow = window.open(getEndpoint("html"), "_blank");
    if (printWindow) {
      printWindow.focus();
      printWindow.onload = () => printWindow.print();
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const pdfUrl = getEndpoint("pdf");
      const res = await fetch(pdfUrl);

      // If serverless returned PDF fallback (or direct HTML due to missing Chromium)
      if (res.headers.get("X-Pdf-Fallback") || res.headers.get("content-type")?.includes("text/html")) {
        // Instant browser print dialog
        handlePrint();
        return;
      }

      if (!res.ok) {
        // Fallback to direct print
        handlePrint();
        return;
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute(
        "download",
        `Mathaba-${docType === "quotation" ? (docLanguage === "fr" ? "Devis" : "Quotation") : (docLanguage === "fr" ? "Etat-Couts" : "InternalReport")}-${(pilgrimName || offerName || "document").replace(/\s+/g, "-")}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn("Direct PDF download fell back to browser print:", e);
      handlePrint();
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (!isOpen) return null;

  const isFr = docLanguage === "fr";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide">
                  {docType === "quotation"
                    ? (isFr ? "Devis Voyage Omra (Customer Quotation)" : "عرض سعر العمرة للمعتمر")
                    : (isFr
                        ? (includeMargins ? "État des Coûts & Marges (Audit)" : "État Détaillé des Coûts (Fournisseurs)")
                        : (includeMargins ? "بيان التكلفة والتدقيق المالي الشامل" : "بيان التكلفة للموردين والتنفيذ")
                      )
                  }
                </h3>
                {docType === "internal-report" && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    includeMargins
                      ? "bg-rose-500/30 text-rose-300 border-rose-500/50"
                      : "bg-emerald-500/30 text-emerald-300 border-emerald-500/50"
                  }`}>
                    {includeMargins ? (isFr ? "Confidentiel Marges" : "سري للغاية") : (isFr ? "Partageable" : "بيان معتمد")}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {pilgrimName ? `${isFr ? "Pèlerin" : "المعتمر"}: ${pilgrimName}` : offerName ? `${isFr ? "Forfait" : "الباقة"}: ${offerName}` : ""}
              </p>
            </div>
          </div>

          {/* Controls: Doc Type Switcher, Language Toggle, Margins Option & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Document Type Tabs */}
            <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setDocType("quotation")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  docType === "quotation"
                    ? "bg-emerald-600 text-white font-bold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {isFr ? "Devis Client" : "عرض السعر"}
              </button>
              <button
                onClick={() => setDocType("internal-report")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  docType === "internal-report"
                    ? "bg-rose-700 text-white font-bold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {isFr ? "État des Coûts" : "بيان التكلفة"}
              </button>
            </div>

            {/* Language Switcher Pill */}
            <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setDocLanguage("ar")}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  docLanguage === "ar"
                    ? "bg-amber-600 text-white font-bold"
                    : "text-slate-300 hover:text-white"
                }`}
                title="العرض باللغة العربية (RTL)"
              >
                العربية
              </button>
              <button
                onClick={() => setDocLanguage("fr")}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  docLanguage === "fr"
                    ? "bg-amber-600 text-white font-bold"
                    : "text-slate-300 hover:text-white"
                }`}
                title="Afficher en Français (LTR)"
              >
                Français
              </button>
            </div>

            {/* Margins Toggle (for Internal Cost Statement only) */}
            {docType === "internal-report" && (
              <button
                onClick={() => setIncludeMargins(!includeMargins)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  includeMargins
                    ? "bg-rose-950/80 text-rose-300 border-rose-700 hover:bg-rose-900"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
                }`}
                title={isFr ? "Activer/désactiver l'affichage des marges et prix de vente" : "تضمين أو إخفاء هوامش الربح وأسعار البيع في بيان التكلفة"}
              >
                {includeMargins ? <ToggleRight className="w-4 h-4 text-rose-400" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                <span className="hidden sm:inline">
                  {includeMargins ? (isFr ? "Marges incluses" : "الهوامش ظاهرة") : (isFr ? "Marges masquées" : "الهوامش مخفية")}
                </span>
              </button>
            )}

            {/* Room category picker for offer */}
            {resolvedEntityType === "offer" && (
              <select
                value={roomCategory}
                onChange={(e) => setRoomCategory(e.target.value as RoomCategory)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 border border-slate-700 focus:outline-hidden"
              >
                <option value={RoomCategory.DOUBLE}>{isFr ? "Double (2)" : "ثنائية (2)"}</option>
                <option value={RoomCategory.SINGLE}>{isFr ? "Individuelle (1)" : "فردية (1)"}</option>
                <option value={RoomCategory.TRIPLE}>{isFr ? "Triple (3)" : "ثلاثية (3)"}</option>
                <option value={RoomCategory.QUAD}>{isFr ? "Quadruple (4)" : "رباعية (4)"}</option>
              </select>
            )}

            {/* Native High-Fidelity Browser Print Button (Zero-Failure Netlify Free PDF) */}
            <button
              onClick={handlePrint}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title={isFr ? "Imprimer ou enregistrer en PDF (A4)" : "طباعة أو حفظ كملف PDF عالي الدقة (A4)"}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isFr ? "Imprimer / PDF" : "طباعة / PDF"}</span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={loading || downloadingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title={isFr ? "Télécharger le document" : "تحميل المستند"}
            >
              {downloadingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isFr ? "Télécharger" : "تحميل"}</span>
            </button>

            {/* Standalone Tab Button (Mobile Safari / Chrome Direct PDF Export) */}
            <a
              href={getEndpoint("html")}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors inline-flex items-center justify-center"
              title={isFr ? "Ouvrir dans un nouvel onglet" : "فتح في نافذة مستقلة"}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Document Preview Viewport */}
        <div className="flex-1 bg-slate-100/70 p-4 overflow-y-auto flex justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
              <p className="text-xs font-semibold">
                {isFr ? "Préparation du document officiel en cours..." : "جاري إعداد ومعالجة الوثيقة الرسمية..."}
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-16 text-rose-600 text-center max-w-md">
              <ShieldAlert className="w-10 h-10 mb-2" />
              <p className="font-bold text-sm mb-1">{isFr ? "Erreur de chargement" : "خطأ أثناء تحميل المستند"}</p>
              <p className="text-xs text-slate-500">{error}</p>
              <button
                onClick={fetchDocumentHtml}
                className="mt-4 px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
              >
                {isFr ? "Réessayer" : "إعادة المحاولة"}
              </button>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              title="A4 Document Preview"
              className="w-full max-w-[210mm] min-h-[297mm] bg-white rounded-lg shadow-lg border border-slate-300"
            />
          )}
        </div>
      </div>
    </div>
  );
}
