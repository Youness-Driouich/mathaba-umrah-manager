"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  ArrowRight,
  Calendar,
  Users,
  Plane,
  Bus,
  Globe,
  Save,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { CostAllocationType, Currency, TripStatus } from "@prisma/client";

export default function EditTripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    expectedPilgrims: 40,
    airlineName: "",
    flightCost: 0,
    flightCurrency: Currency.MAD as Currency,
    flightAllocationType: CostAllocationType.PER_PERSON as CostAllocationType,
    sarToMadRate: 2.7,
    eurToMadRate: 10.85,
    groupBusCostSar: 0,
    groupBusCount: 1,
    status: TripStatus.DRAFT as TripStatus,
    notes: "",
  });

  useEffect(() => {
    async function loadTrip() {
      try {
        setLoading(true);
        const res = await fetch(`/api/trips/${tripId}`);
        const data = await res.json();
        if (res.ok && data.trip) {
          const t = data.trip;
          setFormData({
            name: t.name,
            startDate: t.startDate ? new Date(t.startDate).toISOString().split("T")[0] : "",
            endDate: t.endDate ? new Date(t.endDate).toISOString().split("T")[0] : "",
            expectedPilgrims: t.expectedPilgrims,
            airlineName: t.airlineName || "",
            flightCost: t.flightCost,
            flightCurrency: t.flightCurrency,
            flightAllocationType: t.flightAllocationType,
            sarToMadRate: t.sarToMadRate,
            eurToMadRate: t.eurToMadRate,
            groupBusCostSar: t.groupBusCostSar,
            groupBusCount: t.groupBusCount,
            status: t.status,
            notes: t.notes || "",
          });
        } else {
          throw new Error(data.error || "تعذر العثور على الرحلة");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء تحميل بيانات الرحلة");
      } finally {
        setLoading(false);
      }
    }
    if (tripId) loadTrip();
  }, [tripId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل تحديث بيانات الرحلة.");
      }

      router.push(`/trips/${tripId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ التعديلات.");
      setSubmitting(false);
    }
  };

  const busCostPerPilgrimSar =
    formData.expectedPilgrims > 0 ? formData.groupBusCostSar / formData.expectedPilgrims : 0;
  const busCostPerPilgrimMad = busCostPerPilgrimSar * formData.sarToMadRate;

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
        <span>جاري تحميل بيانات الرحلة للتعديل...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* رأس الصفحة */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <Link
          href={`/trips/${tripId}`}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="الرجوع لمساحة عمل الرحلة"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-6 h-6 text-emerald-700" />
            <span>تعديل بيانات رحلة العمرة</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تعديل تواريخ السفر، تذاكر الطيران، أسعار الصرف، وحافلات المجموعات
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* القسم 1: هوية الرحلة والتواريخ */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">هوية الرحلة وفترة السفر</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                اسم الرحلة *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ الذهاب *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ العودة *
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                سعة المعتمرين المتوقعة *
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.expectedPilgrims}
                  onChange={(e) =>
                    setFormData({ ...formData, expectedPilgrims: parseInt(e.target.value) || 1 })
                  }
                  className="w-full pr-9 pl-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                حالة الرحلة
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TripStatus })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value={TripStatus.DRAFT}>مسودة (قيد الإعداد)</option>
                <option value={TripStatus.ACTIVE}>نشطة (مفتوحة للحجز)</option>
                <option value={TripStatus.FINALIZED}>معتمدة</option>
                <option value={TripStatus.ARCHIVED}>مؤرشفة</option>
              </select>
            </div>
          </div>
        </div>

        {/* القسم 2: تذاكر الطيران */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Plane className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">تذاكر الطيران وتوزيع التكلفة</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                شركة الطيران الناقلة
              </label>
              <input
                type="text"
                value={formData.airlineName}
                onChange={(e) => setFormData({ ...formData, airlineName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تكلفة التذكرة
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.flightCost}
                  onChange={(e) =>
                    setFormData({ ...formData, flightCost: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  عملة التذكرة
                </label>
                <select
                  value={formData.flightCurrency}
                  onChange={(e) =>
                    setFormData({ ...formData, flightCurrency: e.target.value as Currency })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  <option value={Currency.MAD}>درهم مغربي (MAD)</option>
                  <option value={Currency.SAR}>ريال سعودي (SAR)</option>
                  <option value={Currency.EUR}>يورو (EUR)</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                طريقة احتساب تكلفة الطيران
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <label
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    formData.flightAllocationType === CostAllocationType.PER_PERSON
                      ? "border-emerald-600 bg-emerald-50/50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="flightAllocationType"
                    value={CostAllocationType.PER_PERSON}
                    checked={formData.flightAllocationType === CostAllocationType.PER_PERSON}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        flightAllocationType: CostAllocationType.PER_PERSON,
                      })
                    }
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-600"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-900">
                      سعر فردي مباشر لكل تذكرة
                    </span>
                    <span className="text-[11px] text-slate-500">
                      تكلفة التذكرة المحددة أعلاه تُطبق مباشرة لكل معتمر.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    formData.flightAllocationType === CostAllocationType.GROUP_TOTAL
                      ? "border-emerald-600 bg-emerald-50/50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="flightAllocationType"
                    value={CostAllocationType.GROUP_TOTAL}
                    checked={formData.flightAllocationType === CostAllocationType.GROUP_TOTAL}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        flightAllocationType: CostAllocationType.GROUP_TOTAL,
                      })
                    }
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-600"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-900">
                      طيران عارض إجمالي مقسوم على المعتمرين
                    </span>
                    <span className="text-[11px] text-slate-500">
                      التكلفة الإجمالية تُقسم آلياً على عدد معتمري الرحلة.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* القسم 3: حافلات المجموعات */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bus className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">حافلات المجموعات (النقل الجماعي)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                التكلفة الإجمالية للحافلات (ر.س)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.groupBusCostSar}
                  onChange={(e) =>
                    setFormData({ ...formData, groupBusCostSar: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-3 pr-14 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ر.س
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                عدد الحافلات المحجوزة
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.groupBusCount}
                onChange={(e) =>
                  setFormData({ ...formData, groupBusCount: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="md:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">نصيب المعتمر الواحد التقديري من الحافلة:</span>
              <span className="font-bold text-emerald-700">
                {busCostPerPilgrimSar.toFixed(1)} ر.س ≈ {busCostPerPilgrimMad.toFixed(1)} د.م. لكل معتمر
              </span>
            </div>
          </div>
        </div>

        {/* القسم 4: أسعار الصرف للرحلة */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Globe className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">أسعار الصرف المعتمدة لهذه الرحلة</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                سعر صرف الريال السعودي (SAR / MAD)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required
                  value={formData.sarToMadRate}
                  onChange={(e) =>
                    setFormData({ ...formData, sarToMadRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-3 pr-14 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  د.م.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                سعر صرف اليورو (EUR / MAD)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required
                  value={formData.eurToMadRate}
                  onChange={(e) =>
                    setFormData({ ...formData, eurToMadRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-3 pr-14 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  د.م.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* القسم 5: ملاحظات داخلية */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <label className="block text-xs font-semibold text-slate-700">
            ملاحظات داخلية للرحلة (اختياري)
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-sans"
          />
        </div>

        {/* أزرار الحفظ والإلغاء */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/trips/${tripId}`}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            إلغاء
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
