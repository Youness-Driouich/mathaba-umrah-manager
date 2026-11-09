"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Plus,
  Layers,
  Users,
  Bus,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Building2,
  Plane,
  Coins,
  ArrowLeft,
  Settings,
  Printer,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { DocumentViewerModal } from "@/components/documents/document-viewer-modal";

interface TripSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  expectedPilgrims: number;
  airlineName?: string | null;
  status: string;
  offersCount: number;
}

interface OfferSummary {
  id: string;
  name: string;
  tripName?: string;
  pricingSummary?: {
    quadMad: number | string;
    doubleMad: number | string;
  };
}

interface QuoteSummary {
  id: string;
  pilgrimName: string;
  tripName: string;
  offerName: string;
  roomCategory: string;
  calculation?: {
    finalSellingPriceMad: number;
    newActualCostMad: number;
    realizedProfitMad: number;
  };
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [offers, setOffers] = useState<OfferSummary[]>([]);
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Document modal for direct preview from dashboard
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedPilgrimName, setSelectedPilgrimName] = useState<string>("");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [tripsRes, offersRes, quotesRes] = await Promise.all([
          fetch("/api/trips").then((r) => (r.ok ? r.json() : { trips: [] })),
          fetch("/api/offers").then((r) => (r.ok ? r.json() : { offers: [] })),
          fetch("/api/quotes").then((r) => (r.ok ? r.json() : { quotes: [] })),
        ]);

        if (tripsRes.trips) setTrips(tripsRes.trips);
        if (offersRes.offers) setOffers(offersRes.offers);
        if (quotesRes.quotes) setQuotes(quotesRes.quotes);
      } catch (e) {
        console.error("Failed to load dashboard data:", e);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("ar-MA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const roomCategoryLabel = (cat: string) => {
    switch (cat) {
      case "SINGLE":
        return "غرفة فردية";
      case "DOUBLE":
        return "غرفة ثنائية";
      case "TRIPLE":
        return "غرفة ثلاثية";
      case "QUAD":
        return "غرفة رباعية";
      default:
        return cat;
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* 1. Welcome & Primary Quick Actions */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 text-white p-6 md:p-8 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>نظام وكالة الأسفار لإدارة وحسابات رحلات العمرة</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            مرحباً بك في منصة مَثابة
          </h1>
          <p className="mt-2 text-sm md:text-base text-emerald-100/90 leading-relaxed">
            المنصة الموحدة لحساب تكاليف الفنادق والطيران، ضبط أرباح الباقات، وإصدار عروض الأسعار الرسمية وبيانات التكلفة بنقرة زر واحدة.
          </p>

          {/* Big Intuitive Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/trips"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>إدارة رحلات العمرة</span>
            </Link>

            <Link
              href="/quotes"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs md:text-sm font-bold rounded-xl backdrop-blur-xs transition-all cursor-pointer border border-white/10"
            >
              <Users className="w-4 h-4" />
              <span>عروض أسعار المعتمرين</span>
            </Link>

            <Link
              href="/transport-catalog"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs md:text-sm font-bold rounded-xl backdrop-blur-xs transition-all cursor-pointer border border-white/10"
            >
              <Bus className="w-4 h-4" />
              <span>دليل أسعار النقل (66 مسار)</span>
            </Link>
          </div>
        </div>

        <div className="absolute left-0 bottom-0 opacity-10 pointer-events-none transform -translate-x-10 translate-y-10">
          <Building2 className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* 2. Key Live Stats (Simplified KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/trips"
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 transition-all shadow-xs group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500">رحلات العمرة الحالية</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {loading ? "..." : trips.length}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
            <span>عرض كل الرحلات</span>
            <ArrowLeft className="w-3 h-3" />
          </div>
        </Link>

        <Link
          href="/offers"
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 transition-all shadow-xs group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500">باقات وعروض الفنادق</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {loading ? "..." : offers.length}
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1 flex items-center gap-1">
            <span>مصفوفة أسعار الغرف</span>
            <ArrowLeft className="w-3 h-3" />
          </div>
        </Link>

        <Link
          href="/quotes"
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 transition-all shadow-xs group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500">عروض المعتمرين الفردية</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {loading ? "..." : quotes.length}
          </div>
          <div className="text-[11px] text-purple-700 font-medium mt-1 flex items-center gap-1">
            <span>العروض والترقيات الخاصة</span>
            <ArrowLeft className="w-3 h-3" />
          </div>
        </Link>

        <Link
          href="/transport-catalog"
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 transition-all shadow-xs group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Bus className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500">دليل النقل والسيارات</span>
          <div className="text-2xl font-black text-slate-900 mt-1">66</div>
          <div className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
            <span>تسعيرة الموردين المعتمدة</span>
            <ArrowLeft className="w-3 h-3" />
          </div>
        </Link>
      </div>

      {/* 3. Active Umrah Trips Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-600" />
              <span>رحلات العمرة المفتوحة حالياً</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              قائمة الرحلات المجدولة والمسجلة في قاعدة البيانات
            </p>
          </div>
          <Link
            href="/trips"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>عرض كل الرحلات</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm font-medium">
            جاري تحميل الرحلات...
          </div>
        ) : trips.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            لا توجد رحلات حالياً. اضغط على "إدارة رحلات العمرة" لإضافة أول رحلة.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-base">
                      {trip.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {trip.status === "DRAFT" ? "مسودة عمل" : "رحلة معتمدة"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(trip.startDate)} ➔ {formatDate(trip.endDate)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>الفوج: <strong>{trip.expectedPilgrims} معتمر</strong></span>
                    </span>
                    {trip.airlineName && (
                      <span className="flex items-center gap-1">
                        <Plane className="w-3.5 h-3.5 text-slate-400" />
                        <span>{trip.airlineName}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/trips/${trip.id}`}
                    className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition-colors"
                  >
                    فتح الرحلة والأسعار
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Recent Pilgrim Quotations */}
      {quotes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>أحدث عروض الأسعار للمعتمرين</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                عروض أسعار مخصصة مع إمكانية المعاينة والطباعة الفورية
              </p>
            </div>
            <Link
              href="/quotes"
              className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1"
            >
              <span>عرض كل العروض</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm md:text-base">
                      {q.pilgrimName}
                    </span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                      {roomCategoryLabel(q.roomCategory)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {q.tripName} • {q.offerName}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {q.calculation && (
                    <div className="text-left rtl:text-right">
                      <div className="text-xs text-slate-400">سعر البيع النهائي</div>
                      <div className="text-base font-black text-emerald-700" suppressHydrationWarning>
                        {q.calculation.finalSellingPriceMad.toLocaleString("en-US")} د.م.
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedQuoteId(q.id);
                      setSelectedPilgrimName(q.pilgrimName);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-300" />
                    <span>معاينة وطباعة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Simple 3-Step Agency Workflow Guide */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6">
        <h3 className="font-bold text-sm md:text-base text-emerald-950 flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <span>طريقة العمل المبسطة في منصة مَثابة (3 خطوات سهلة):</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center mb-2">
              1
            </div>
            <h4 className="font-bold text-sm text-slate-900">أنشئ رحلة العمرة</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              حدد تواريخ الذهاب والعودة، تكلفة تذكرة الطيران، وتكلفة التأشيرة وحافلة المجموعة.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center mb-2">
              2
            </div>
            <h4 className="font-bold text-sm text-slate-900">حدد باقات الفنادق والربح</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              اختر فنادق مكة والمدينة وسعر الغرفة لليلة، وحدد هامش الربح المطلوب للوكالة بالدرهم.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center mb-2">
              3
            </div>
            <h4 className="font-bold text-sm text-slate-900">اطبع عرض السعر فوراً</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              اطبع عرض السعر الرسمي للزبون بنقرة واحدة (بالعربية أو الفرنسية) أو بيان التكلفة المفصل للإدارة.
            </p>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal for Direct Preview */}
      {selectedQuoteId && (
        <DocumentViewerModal
          isOpen={!!selectedQuoteId}
          onClose={() => setSelectedQuoteId(null)}
          entityType="quote"
          entityId={selectedQuoteId}
          pilgrimName={selectedPilgrimName}
          defaultDocType="quotation"
        />
      )}
    </div>
  );
}
