"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Eye,
  Plus,
  Compass,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { QuoteStatus, RoomCategory } from "@prisma/client";

interface QuoteListItem {
  id: string;
  offerId: string;
  offerName: string;
  tripId: string;
  tripName: string;
  pilgrimName: string;
  contactPhone?: string | null;
  roomCategory: RoomCategory;
  overrideProfitMad?: number | null;
  commercialDiscountMad: number;
  arbitraryAdjustmentMad: number;
  status: QuoteStatus;
  customizationsCount: number;
  calculation: {
    baseCostMad: number;
    supplierCostDeltaMad: number;
    supplierCostAdditionsMad: number;
    supplierCostReductionsMad: number;
    newActualCostMad: number;
    baseProfitMad: number;
    isProfitOverridden: boolean;
    appliedDiscountMad: number;
    finalSellingPriceMad: number;
    realizedProfitMad: number;
    isDeficit: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export default function CentralQuotesPage() {
  const { t, language } = useLanguage();
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/quotes?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load quotes");
      const data = await res.json();
      setQuotes(data.quotes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuotes();
  };

  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.CONFIRMED:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            {t("finalizedStatus")}
          </span>
        );
      case QuoteStatus.DRAFT:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            {t("draftStatus")}
          </span>
        );
      case QuoteStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
            {language === "ar" ? "ملغي" : "Cancelled"}
          </span>
        );
      case QuoteStatus.ARCHIVED:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
            <Archive className="w-3 h-3" />
            {t("archivedStatus")}
          </span>
        );
      default:
        return null;
    }
  };

  const getRoomBadge = (cat: RoomCategory) => {
    switch (cat) {
      case RoomCategory.SINGLE:
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">فردي (1)</span>;
      case RoomCategory.DOUBLE:
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">ثنائي (2)</span>;
      case RoomCategory.TRIPLE:
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">ثلاثي (3)</span>;
      case RoomCategory.QUAD:
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">رباعي (4)</span>;
    }
  };

  // KPI calculations
  const totalCount = quotes.length;
  const confirmedCount = quotes.filter((q) => q.status === QuoteStatus.CONFIRMED).length;
  const totalCustomRevenue = quotes
    .filter((q) => q.status === QuoteStatus.CONFIRMED)
    .reduce((sum, q) => sum + q.calculation.finalSellingPriceMad, 0);
  const totalCustomProfit = quotes
    .filter((q) => q.status === QuoteStatus.CONFIRMED)
    .reduce((sum, q) => sum + q.calculation.realizedProfitMad, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {language === "ar" ? "المرحلة الخامسة: الحالات الاستثنائية" : "Phase 5: Individual Exceptions"}
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-500">
              {totalCount} {language === "ar" ? "عرض مخصص" : "quotes"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
            {t("customizedQuotes")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("individualExceptionsSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/offers"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>{t("navOffers")}</span>
          </Link>
          <Link
            href="/trips"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>{t("navTrips")}</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {language === "ar" ? "إجمالي العروض الفردية" : "Total Quotes"}
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{quotes.filter((q) => q.status === QuoteStatus.DRAFT).length} {t("draftStatus")}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {language === "ar" ? "العروض المعتمدة" : "Confirmed Quotes"}
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{confirmedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === "ar" ? "جاهزة للتعاقد والفوترة" : "Confirmed bookings"}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {language === "ar" ? "إجمالي مبيعات العروض المعتمدة" : "Confirmed Revenue"}
          </span>
          <div className="text-2xl font-black text-blue-700 mt-1" suppressHydrationWarning>
            {totalCustomRevenue.toLocaleString("en-US")} <span className="text-xs font-normal">{t("currencyMad")}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {language === "ar" ? "مبيعات البيع النهائي للمعتمرين" : "Gross retail revenue"}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {language === "ar" ? "صافي أرباح العروض المعتمدة" : "Confirmed Net Profit"}
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1" suppressHydrationWarning>
            {totalCustomProfit.toLocaleString("en-US")} <span className="text-xs font-normal">{t("currencyMad")}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === "ar" ? "بعد خصم تكاليف الموردين والخصومات" : "After supplier costs"}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === "ar" ? "بحث باسم المعتمر، الرحلة، الباقة، أو الهاتف..." : "Search pilgrim, trip, offer..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full ps-9 pe-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 bg-white"
          >
            <option value="ALL">{t("allStatuses")}</option>
            <option value={QuoteStatus.DRAFT}>{t("draftStatus")}</option>
            <option value={QuoteStatus.CONFIRMED}>{t("finalizedStatus")}</option>
            <option value={QuoteStatus.CANCELLED}>{language === "ar" ? "ملغي" : "Cancelled"}</option>
            <option value={QuoteStatus.ARCHIVED}>{t("archivedStatus")}</option>
          </select>

          <button
            onClick={fetchQuotes}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <p>{t("loading")}</p>
          </div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">{t("noQuotesYet")}</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              {language === "ar"
                ? "يمكنك فتح أي باقة ضمن رحلة عمرة وإضافة حالات استثنائية لمعتمر محدد."
                : "Open any offer in an Umrah trip to create a personalized quote for a pilgrim."}
            </p>
            <div className="pt-2">
              <Link
                href="/offers"
                className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t("navOffers")}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-start">{t("pilgrimName")}</th>
                  <th className="py-3 px-4 text-start">{t("roomCategory")}</th>
                  <th className="py-3 px-4 text-start">{language === "ar" ? "الرحلة والباقة" : "Trip & Offer"}</th>
                  <th className="py-3 px-4 text-end">{t("newActualCost")}</th>
                  <th className="py-3 px-4 text-end">{t("customizedSellingPrice")}</th>
                  <th className="py-3 px-4 text-end">{t("realizedProfit")}</th>
                  <th className="py-3 px-4 text-center">{t("quoteStatus")}</th>
                  <th className="py-3 px-4 text-center">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map((quote) => {
                  return (
                    <tr
                      key={quote.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        quote.calculation.isDeficit ? "bg-rose-50/40" : ""
                      }`}
                    >
                      {/* Pilgrim Name & Contact */}
                      <td className="py-3.5 px-4 font-medium">
                        <div className="font-bold text-slate-900 text-sm">{quote.pilgrimName}</div>
                        {quote.contactPhone ? (
                          <div className="text-[11px] text-slate-500 mt-0.5">{quote.contactPhone}</div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">{language === "ar" ? "بدون هاتف" : "No phone"}</div>
                        )}
                        {quote.customizationsCount > 0 && (
                          <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded mt-1 border border-emerald-100">
                            {quote.customizationsCount} {language === "ar" ? "تعديلات مخصصة" : "exceptions"}
                          </span>
                        )}
                      </td>

                      {/* Room Category */}
                      <td className="py-3.5 px-4">
                        {getRoomBadge(quote.roomCategory)}
                      </td>

                      {/* Trip & Offer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{quote.offerName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Compass className="w-3 h-3 text-slate-400" />
                          <span>{quote.tripName}</span>
                        </div>
                      </td>

                      {/* New Actual Cost */}
                      <td className="py-3.5 px-4 text-end">
                        <div className="font-bold text-slate-700">
                          {quote.calculation.newActualCostMad.toLocaleString()} {t("currencyMad")}
                        </div>
                        {quote.calculation.supplierCostDeltaMad !== 0 && (
                          <div
                            className={`text-[10px] font-semibold ${
                              quote.calculation.supplierCostDeltaMad > 0 ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {quote.calculation.supplierCostDeltaMad > 0 ? "+" : ""}
                            {quote.calculation.supplierCostDeltaMad.toLocaleString()} {t("currencyMad")}
                          </div>
                        )}
                      </td>

                      {/* Final Selling Price */}
                      <td className="py-3.5 px-4 text-end">
                        <div className="font-black text-slate-900 text-sm">
                          {quote.calculation.finalSellingPriceMad.toLocaleString()} {t("currencyMad")}
                        </div>
                        {quote.calculation.appliedDiscountMad > 0 && (
                          <div className="text-[10px] text-amber-700 font-semibold">
                            -{quote.calculation.appliedDiscountMad.toLocaleString()} {t("currencyMad")} خصم
                          </div>
                        )}
                      </td>

                      {/* Realized Profit */}
                      <td className="py-3.5 px-4 text-end">
                        <div
                          className={`font-black text-xs ${
                            quote.calculation.realizedProfitMad >= 0 ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {quote.calculation.realizedProfitMad.toLocaleString()} {t("currencyMad")}
                        </div>
                        {quote.calculation.isDeficit && (
                          <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-rose-600 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            <span>عجز مالي!</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(quote.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/quotes/${quote.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t("viewQuote")}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
