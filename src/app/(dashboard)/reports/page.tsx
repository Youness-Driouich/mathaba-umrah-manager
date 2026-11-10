"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Eye,
  Download,
  Printer,
  Compass,
  Layers,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { DocumentViewerModal } from "@/components/documents/document-viewer-modal";
import { RoomCategory, QuoteStatus } from "@prisma/client";

interface ReportOfferItem {
  id: string;
  name: string;
  tripId: string;
  tripName: string;
  fixedProfitMad: number;
  isActive: boolean;
  hotelStaysCount: number;
  quotesCount: number;
  matrix?: {
    DOUBLE?: {
      finalSellingPriceMad: number;
      totalActualCostMad: number;
      effectiveProfitMad: number;
      isDeficit: boolean;
    };
  };
}

interface ReportQuoteItem {
  id: string;
  pilgrimName: string;
  contactPhone?: string | null;
  roomCategory: RoomCategory;
  offerId: string;
  offerName: string;
  tripId: string;
  tripName: string;
  status: QuoteStatus;
  calculation: {
    newActualCostMad: number;
    finalSellingPriceMad: number;
    realizedProfitMad: number;
    isDeficit: boolean;
  };
  createdAt: string;
}

export default function ReportsHubPage() {
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<"QUOTES" | "OFFERS">("QUOTES");
  const [quotes, setQuotes] = useState<ReportQuoteItem[]>([]);
  const [offers, setOffers] = useState<ReportOfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [selectedDoc, setSelectedDoc] = useState<{
    entityType: "offer" | "quote";
    entityId: string;
    defaultDocType: "quotation" | "internal-report";
    pilgrimName?: string;
    offerName?: string;
    roomCategory?: RoomCategory;
  } | null>(null);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const [quotesRes, offersRes] = await Promise.all([
        fetch("/api/quotes"),
        fetch("/api/offers"),
      ]);

      if (quotesRes.ok) {
        const qData = await quotesRes.json();
        setQuotes(qData.quotes || []);
      }
      if (offersRes.ok) {
        const oData = await offersRes.json();
        setOffers(oData.offers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const filteredQuotes = quotes.filter((q) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      q.pilgrimName.toLowerCase().includes(s) ||
      q.offerName.toLowerCase().includes(s) ||
      q.tripName.toLowerCase().includes(s)
    );
  });

  const filteredOffers = offers.filter((o) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return o.name.toLowerCase().includes(s) || o.tripName.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {language === "ar" ? "الوثائق والتقارير المالية الرسمية" : "Official Documents & Financial Reports"}
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-500">
              {quotes.length} {language === "ar" ? "عروض معتمرين" : "quotes"} • {offers.length} {language === "ar" ? "باقات جماعية" : "offers"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
            {language === "ar" ? "مركز التقارير المالية وعروض الأسعار الرسمية" : "Financial Reports & PDF Quotations Hub"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === "ar"
              ? "إصدار ومعاينة وطباعة عروض الأسعار الرسمية للمعتمرين والتقارير المالية الداخلية السرية بصيغة PDF معتمدة."
              : "Generate, preview, print, and download formal Arabic PDF quotations and confidential internal audit reports."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>{language === "ar" ? "إعدادات وهوية الوثائق" : "Document Settings"}</span>
          </Link>
          <button
            onClick={fetchReportsData}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {language === "ar" ? "عروض المعتمرين الفردية" : "Custom Pilgrim Quotes"}
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{quotes.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === "ar" ? "عروض مخصصة بالاستثناءات" : "Individual customized"}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {language === "ar" ? "باقات الرحلات الجماعية" : "Standard Trip Offers"}
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{offers.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === "ar" ? "باقات تسعير كاملة" : "Complete base offers"}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {language === "ar" ? "حماية السرية المالية" : "Financial Confidentiality"}
          </span>
          <div className="text-2xl font-black text-blue-700 mt-1">100%</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>{language === "ar" ? "عزل كامل لتكاليف الموردين والأرباح" : "Zero supplier leaks"}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {language === "ar" ? "صيغة الطباعة والتصدير" : "Rendering Engine"}
          </span>
          <div className="text-2xl font-black text-purple-700 mt-1">PDF / A4</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {language === "ar" ? "خط عربي معتمد وهوية إسلامية أنيقة" : "Chromium Native Arabic RTL"}
          </div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full md:w-auto">
          <button
            onClick={() => setActiveTab("QUOTES")}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === "QUOTES"
                ? "bg-white text-emerald-900 font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {language === "ar" ? "عروض المعتمرين الفردية" : "Pilgrim Quotes"} ({quotes.length})
          </button>
          <button
            onClick={() => setActiveTab("OFFERS")}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === "OFFERS"
                ? "bg-white text-emerald-900 font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {language === "ar" ? "باقات الرحلات الجماعية" : "Trip Offers"} ({offers.length})
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === "ar" ? "بحث بالمعتمر، الباقة، أو الرحلة..." : "Search quotes, offers..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full ps-9 pe-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Main Content Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <p>{t("loading")}</p>
          </div>
        ) : activeTab === "QUOTES" ? (
          filteredQuotes.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">{t("noQuotesYet")}</p>
              <Link href="/quotes" className="text-emerald-700 underline text-xs">
                فتح مركز عروض المعتمرين
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 text-start">{t("pilgrimName")}</th>
                    <th className="py-3 px-4 text-start">{language === "ar" ? "الرحلة والباقة" : "Trip & Offer"}</th>
                    <th className="py-3 px-4 text-start">{t("roomCategory")}</th>
                    <th className="py-3 px-4 text-end">{t("customizedSellingPrice")}</th>
                    <th className="py-3 px-4 text-end">{t("realizedProfit")}</th>
                    <th className="py-3 px-4 text-center">{t("quoteStatus")}</th>
                    <th className="py-3 px-4 text-center">{language === "ar" ? "وثائق PDF والتقارير" : "Document Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuotes.map((q) => (
                    <tr
                      key={q.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        q.calculation.isDeficit ? "bg-rose-50/40" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-medium">
                        <div className="font-bold text-slate-900 text-sm">{q.pilgrimName}</div>
                        {q.contactPhone && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{q.contactPhone}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{q.offerName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Compass className="w-3 h-3 text-slate-400" />
                          <span>{q.tripName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {q.roomCategory === "SINGLE" && "فردية (1)"}
                          {q.roomCategory === "DOUBLE" && "ثنائية (2)"}
                          {q.roomCategory === "TRIPLE" && "ثلاثية (3)"}
                          {q.roomCategory === "QUAD" && "رباعية (4)"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-end">
                        <div className="font-black text-slate-900 text-sm">
                          {q.calculation.finalSellingPriceMad.toLocaleString()} {t("currencyMad")}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-end">
                        <div
                          className={`font-black text-xs ${
                            q.calculation.realizedProfitMad >= 0 ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {q.calculation.realizedProfitMad.toLocaleString()} {t("currencyMad")}
                        </div>
                        {q.calculation.isDeficit && (
                          <span className="text-[10px] font-bold text-rose-600 block">عجز مالي!</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {q.status === "CONFIRMED" ? t("finalizedStatus") : t("draftStatus")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Preview Customer Quotation */}
                          <button
                            onClick={() =>
                              setSelectedDoc({
                                entityType: "quote",
                                entityId: q.id,
                                defaultDocType: "quotation",
                                pilgrimName: q.pilgrimName,
                                offerName: q.offerName,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                            title="معاينة وتحميل عرض السعر للمعتمر"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>عرض المعتمر</span>
                          </button>

                          {/* Preview Confidential Internal Report */}
                          <button
                            onClick={() =>
                              setSelectedDoc({
                                entityType: "quote",
                                entityId: q.id,
                                defaultDocType: "internal-report",
                                pilgrimName: q.pilgrimName,
                                offerName: q.offerName,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold rounded-lg border border-rose-200 transition-colors cursor-pointer"
                            title="تقرير التدقيق المالي الداخلي السري"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>تقرير مالي سري</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredOffers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Layers className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">{t("noOffersYet")}</p>
            <Link href="/trips" className="text-emerald-700 underline text-xs">
              فتح رحلات العمرة
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-start">{t("offerName")}</th>
                  <th className="py-3 px-4 text-start">{t("tripName")}</th>
                  <th className="py-3 px-4 text-center">{t("hotelsSection")}</th>
                  <th className="py-3 px-4 text-end">هامش الربح المعتمد</th>
                  <th className="py-3 px-4 text-center">{t("quoteStatus")}</th>
                  <th className="py-3 px-4 text-center">{language === "ar" ? "وثائق PDF والتقارير" : "Document Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {offer.name}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {offer.tripName}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-100">
                        {offer.hotelStaysCount} فنادق
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-end font-black text-emerald-700">
                      {Number(offer.fixedProfitMad).toLocaleString()} {t("currencyMad")}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          offer.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {offer.isActive ? t("activeStatus") : t("inactiveStatus")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* Preview Offer Customer Quotation */}
                        <button
                          onClick={() =>
                            setSelectedDoc({
                              entityType: "offer",
                              entityId: offer.id,
                              defaultDocType: "quotation",
                              offerName: offer.name,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                          title="معاينة وتحميل عرض السعر الرسمي للباقة"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>عرض الباقة</span>
                        </button>

                        {/* Preview Confidential Internal Report */}
                        <button
                          onClick={() =>
                            setSelectedDoc({
                              entityType: "offer",
                              entityId: offer.id,
                              defaultDocType: "internal-report",
                              offerName: offer.name,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold rounded-lg border border-rose-200 transition-colors cursor-pointer"
                          title="تقرير التدقيق المالي الداخلي السري للباقة"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>تقرير مالي سري</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {selectedDoc && (
        <DocumentViewerModal
          isOpen={Boolean(selectedDoc)}
          onClose={() => setSelectedDoc(null)}
          entityType={selectedDoc.entityType}
          entityId={selectedDoc.entityId}
          defaultDocType={selectedDoc.defaultDocType}
          pilgrimName={selectedDoc.pilgrimName}
          offerName={selectedDoc.offerName}
          defaultRoomCategory={selectedDoc.roomCategory || RoomCategory.DOUBLE}
        />
      )}
    </div>
  );
}
