"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Plus,
  Search,
  Calendar,
  Users,
  Plane,
  Bus,
  Copy,
  Archive,
  RefreshCw,
  ExternalLink,
  Edit,
  Globe,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
} from "lucide-react";
import { TripStatus } from "@prisma/client";

interface TripItem {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  expectedPilgrims: number;
  airlineName?: string | null;
  flightCost: number;
  flightCurrency: string;
  flightAllocationType: "PER_PERSON" | "GROUP_TOTAL";
  sarToMadRate: number;
  eurToMadRate: number;
  groupBusCostSar: number;
  groupBusCount: number;
  status: TripStatus;
  notes?: string | null;
  offersCount: number;
}

const STATUS_BADGES: Record<TripStatus, { label: string; className: string }> = {
  DRAFT: { label: "مسودة", className: "bg-slate-100 text-slate-700 border-slate-200" },
  ACTIVE: { label: "نشطة", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  FINALIZED: { label: "معتمدة", className: "bg-blue-100 text-blue-800 border-blue-300" },
  ARCHIVED: { label: "مؤرشفة", className: "bg-amber-100 text-amber-800 border-amber-300" },
};

export default function TripsDirectoryPage() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/trips");
      const data = await res.json();
      if (res.ok && data.trips) {
        setTrips(data.trips);
      }
    } catch {
      setNotification({ type: "error", text: "تعذر تحميل قائمة الرحلات من قاعدة البيانات." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleDuplicate = async (id: string, name: string) => {
    setActionLoadingId(id);
    setNotification(null);
    try {
      const res = await fetch(`/api/trips/${id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تكرار الرحلة");

      setNotification({
        type: "success",
        text: `تم تكرار رحلة "${name}" بنجاح مع الحفاظ على الحماية التاريخية للأسعار!`,
      });
      fetchTrips();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "حدث خطأ أثناء تكرار الرحلة.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleArchive = async (id: string, name: string) => {
    setActionLoadingId(id);
    setNotification(null);
    try {
      const res = await fetch(`/api/trips/${id}/archive`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تعديل حالة الأرشفة");

      setNotification({
        type: "success",
        text: `تم تحديث حالة أرشفة رحلة "${name}".`,
      });
      fetchTrips();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "حدث خطأ أثناء تغيير حالة الأرشفة.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredTrips = trips.filter((t) => {
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.airlineName && t.airlineName.toLowerCase().includes(search.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // إحصائيات
  const totalPilgrims = trips.reduce((acc, t) => acc + (t.status !== "ARCHIVED" ? t.expectedPilgrims : 0), 0);
  const activeCount = trips.filter((t) => t.status === "ACTIVE").length;
  const draftCount = trips.filter((t) => t.status === "DRAFT").length;

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-emerald-700" />
            <span>رحلات العمرة</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة الرحلات وتواريخ السفر، تذاكر الطيران، وتوزيع تكاليف حافلات المجموعات
          </p>
        </div>

        <Link
          href="/trips/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء رحلة جديدة</span>
        </Link>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* شريط المؤشرات الرئيسية */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">إجمالي الرحلات</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{trips.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase">رحلات نشطة</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{activeCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">قيد الإعداد (مسودة)</span>
          <div className="text-2xl font-black text-slate-700 mt-1">{draftCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-600 uppercase">المعتمرون المخطط لهم</span>
          <div className="text-2xl font-black text-blue-700 mt-1">{totalPilgrims}</div>
        </div>
      </div>

      {/* شريط البحث والفلترة */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم الرحلة، شركة الطيران، أو الملاحظات..."
            className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs">
          {[
            { key: "ALL", label: `الكل (${trips.length})` },
            { key: "ACTIVE", label: "نشطة" },
            { key: "DRAFT", label: "مسودة" },
            { key: "FINALIZED", label: "معتمدة" },
            { key: "ARCHIVED", label: "مؤرشفة" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === item.key
                  ? "bg-emerald-700 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* شبكة بطاقات الرحلات */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span>جاري تحميل رحلات العمرة...</span>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-800 text-sm">لا توجد رحلات تطابق البحث أو الفلتر المختار.</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            ابدأ بإنشاء أول رحلة عمرة للموسم لربط تذاكر الطيران، حافلات المجموعات، والباقات الفندقية.
          </p>
          <Link
            href="/trips/new"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" /> إنشاء رحلة جديدة
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTrips.map((trip) => {
            const start = new Date(trip.startDate);
            const end = new Date(trip.endDate);
            const daysDiff = Math.max(
              1,
              Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            );
            const busPerPerson =
              trip.expectedPilgrims > 0 ? trip.groupBusCostSar / trip.expectedPilgrims : 0;

            const isBusy = actionLoadingId === trip.id;

            return (
              <div
                key={trip.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* رأس البطاقة: العنوان والحالة */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 leading-snug">
                        {trip.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {start.toLocaleDateString("ar-MA")} ➔ {end.toLocaleDateString("ar-MA")}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-bold text-emerald-700">{daysDiff} أيام</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        STATUS_BADGES[trip.status].className
                      }`}
                    >
                      {STATUS_BADGES[trip.status].label}
                    </span>
                  </div>

                  {/* شبكة المقاييس والتكاليف */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-100 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-600" /> سعة المعتمرين
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 mt-0.5">
                        {trip.expectedPilgrims} معتمر
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                        <Plane className="w-3 h-3 text-blue-600" /> تذكرة الطيران
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 mt-0.5">
                        {trip.flightCost.toLocaleString()} {trip.flightCurrency}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                        <Bus className="w-3 h-3 text-amber-600" /> نصيب الحافلة
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 mt-0.5">
                        {busPerPerson.toFixed(0)} ر.س / فرد
                      </div>
                    </div>
                  </div>

                  {/* معلومات إضافية */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>أسعار الصرف: الريال {trip.sarToMadRate} د.م. | اليورو {trip.eurToMadRate} د.م.</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-emerald-700">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{trip.offersCount} باقات فندقية</span>
                    </div>
                  </div>
                </div>

                {/* أزرار الإجراءات */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(trip.id, trip.name)}
                      disabled={isBusy}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="نسخ وتكرار الرحلة"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(trip.id, trip.name)}
                      disabled={isBusy}
                      className="p-2 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title={trip.status === "ARCHIVED" ? "تنشيط الرحلة" : "أرشفة الرحلة"}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <Link
                      href={`/trips/${trip.id}/edit`}
                      className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="تعديل بيانات الرحلة"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  </div>

                  <Link
                    href={`/trips/${trip.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <span>فتح مساحة عمل الرحلة والباقات</span>
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
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
