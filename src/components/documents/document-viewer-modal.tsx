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
  const [roomCategory, setRoomCategory] = useState<RoomCategory>(resolvedRoomCategory);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getEndpoint = (format: "html" | "pdf" | "json") => {
    const base = resolvedEntityType === "offer" ? `/api/documents/offers/${resolvedEntityId}` : `/api/documents/quotes/${resolvedEntityId}`;
    const docPath = docType === "quotation" ? "quotation" : "internal-report";
    const params = new URLSearchParams({ format });
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
    if (isOpen && entityId) {
      fetchDocumentHtml();
    }
  }, [isOpen, entityId, docType, roomCategory]);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else {
      const printWindow = window.open(getEndpoint("html"), "_blank");
      if (printWindow) {
        printWindow.focus();
        printWindow.onload = () => printWindow.print();
      }
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const pdfUrl = getEndpoint("pdf");
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.setAttribute(
        "download",
        `Mathaba-${docType === "quotation" ? "Quotation" : "InternalReport"}-${pilgrimName || offerName || "document"}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (!isOpen) return null;

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
                  {docType === "quotation" ? "معاينة عرض السعر (Customer Quotation)" : "التقرير المالي الداخلي (Confidential Internal Audit)"}
                </h3>
                {docType === "internal-report" && (
                  <span className="text-[10px] bg-rose-500/30 text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded-full font-bold">
                    سري للغاية
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {pilgrimName ? `المعتمر: ${pilgrimName}` : offerName ? `الباقة: ${offerName}` : ""}
              </p>
            </div>
          </div>

          {/* Controls: Doc Type Switcher & Actions */}
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
                عرض السعر للمعتمر
              </button>
              <button
                onClick={() => setDocType("internal-report")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  docType === "internal-report"
                    ? "bg-rose-700 text-white font-bold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                التقرير المالي الداخلي
              </button>
            </div>

            {/* Room category picker for offer */}
            {entityType === "offer" && (
              <select
                value={roomCategory}
                onChange={(e) => setRoomCategory(e.target.value as RoomCategory)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 border border-slate-700 focus:outline-hidden"
              >
                <option value={RoomCategory.DOUBLE}>ثنائية (2)</option>
                <option value={RoomCategory.SINGLE}>فردية (1)</option>
                <option value={RoomCategory.TRIPLE}>ثلاثية (3)</option>
                <option value={RoomCategory.QUAD}>رباعية (4)</option>
              </select>
            )}

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title="طباعة الوثيقة (A4)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">طباعة</span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={loading || downloadingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="تحميل كملف PDF رسمي"
            >
              {downloadingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>تحميل PDF</span>
            </button>

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
              <p className="text-xs font-semibold">جاري إعداد ومعالجة الوثيقة الرسمية...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-rose-600 max-w-md text-center">
              <ShieldAlert className="w-10 h-10 mb-2" />
              <p className="font-bold text-sm">تعذر عرض الوثيقة</p>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
            </div>
          ) : (
            <div className="w-full max-w-[210mm] bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden min-h-[297mm]">
              <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                title="Document Preview"
                className="w-full h-[85vh] border-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
