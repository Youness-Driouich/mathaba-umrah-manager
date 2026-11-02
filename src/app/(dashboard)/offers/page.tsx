"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  Building2,
  Calendar,
  Compass,
  ArrowRight,
  RefreshCw,
  Plus,
  Coins,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

interface OfferItem {
  id: string;
  name: string;
  fixedProfitMad: number;
  isActive: boolean;
  notes?: string | null;
  hotelStaysCount: number;
  quotesCount: number;
  trip: {
    id: string;
    name: string;
    slug: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  pricingSummary: {
    singleMad: number;
    doubleMad: number;
    tripleMad: number;
    quadMad: number;
    hasDeficit: boolean;
  };
}

export default function OffersDirectoryPage() {
  const { t, language, dir } = useLanguage();
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/offers");
      const data = await res.json();
      if (res.ok && data.offers) {
        setOffers(data.offers);
      }
    } catch (err) {
      console.error("Error loading offers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const filteredOffers = offers.filter((offer) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      offer.name.toLowerCase().includes(q) ||
      offer.trip.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{t("offersTitle")}</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              {offers.length} {language === "ar" ? "باقات" : "Offers"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{t("offersSubtitle")}</p>
        </div>

        <Link
          href="/trips"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Compass className="w-4 h-4" />
          <span>{language === "ar" ? "الذهاب للرحلات لإضافة باقة" : "Go to Trips to Add Offer"}</span>
        </Link>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
          <input
            type="text"
            placeholder={
              language === "ar"
                ? "البحث باسم الباقة أو اسم رحلة العمرة..."
                : "Search by offer or trip name..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 text-xs border border-slate-200 rounded-lg focus:outline-emerald-600 bg-slate-50 focus:bg-white transition-all"
          />
        </div>

        <button
          onClick={fetchOffers}
          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-lg transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>{t("loading")}</span>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-slate-800">
            {language === "ar" ? "لا توجد باقات مطابقة" : "No offers found"}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {language === "ar"
              ? "يتم إنشاء باقات الفنادق وعروض الأسعار داخل كل رحلة عمرة مستقلة لربطها ببيانات الطيران وحافلات المجموعات."
              : "Offers and hotel packages are created inside individual Umrah trips to connect them with flight and group bus costs."}
          </p>
          <Link
            href="/trips"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>{t("navTrips")}</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((offer) => {
            const start = new Date(offer.trip.startDate);
            const end = new Date(offer.trip.endDate);
            return (
              <div
                key={offer.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  {/* Top Bar: Trip Name & Status */}
                  <div className="flex items-center justify-between text-xs">
                    <Link
                      href={`/trips/${offer.trip.id}`}
                      className="font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>{offer.trip.name}</span>
                    </Link>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        offer.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {offer.isActive ? t("activeStatus") : t("inactiveStatus")}
                    </span>
                  </div>

                  {/* Offer Title */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{offer.name}</h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {start.toLocaleDateString()} ➔ {end.toLocaleDateString()}
                    </p>
                  </div>

                  {/* Highlights */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                    <span className="text-slate-500 font-medium">
                      {language === "ar" ? "هامش الربح المحدد:" : "Configured Profit:"}
                    </span>
                    <span className="font-extrabold text-emerald-700">
                      +{offer.fixedProfitMad.toLocaleString()} {t("currencyMad")}
                    </span>
                  </div>

                  {/* Hotel Count */}
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {offer.hotelStaysCount}{" "}
                      {language === "ar" ? "فنادق مضافة" : "Hotels added"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {offer.quotesCount}{" "}
                      {language === "ar" ? "عروض معتمرين" : "quotes"}
                    </span>
                  </div>

                  {/* Room Prices Matrix Preview */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">
                      {language === "ar" ? "أسعار البيع النهائية (لكل معتمر):" : "Final Selling Prices:"}
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">{t("quadRoom").split(" ")[0]}</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">
                          {offer.pricingSummary.quadMad.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">{t("tripleRoom").split(" ")[0]}</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">
                          {offer.pricingSummary.tripleMad.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">{t("doubleRoom").split(" ")[0]}</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">
                          {offer.pricingSummary.doubleMad.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">{t("singleRoom").split(" ")[0]}</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">
                          {offer.pricingSummary.singleMad.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-3 bg-slate-50 border-t border-slate-100">
                  <Link
                    href={`/trips/${offer.trip.id}/offers/${offer.id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                  >
                    <span>{language === "ar" ? "فتح مساحة عمل الباقة والتسعير" : "Open Offer & Pricing Workspace"}</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
