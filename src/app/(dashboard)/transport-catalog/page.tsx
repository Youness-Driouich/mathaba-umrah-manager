"use client";

import { useEffect, useState } from "react";
import {
  Bus,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Users,
  Percent,
  Calendar,
  X,
} from "lucide-react";
import { VehicleType } from "@prisma/client";

interface TransportRoute {
  id: string;
  routeName: string;
  origin?: string | null;
  destination?: string | null;
  vehicleType: VehicleType;
  capacity: number;
  baseCostSar: number;
  vatIncluded: boolean;
  seasonalNote?: string | null;
  notes?: string | null;
  isActive: boolean;
}

const VEHICLE_CAPACITIES: Record<VehicleType, { label: string; defaultCapacity: number }> = {
  SEDAN: { label: "سيدان (صالون)", defaultCapacity: 4 },
  GMC: { label: "جي إم سي (يوكن / سوبربان)", defaultCapacity: 7 },
  STARIA: { label: "هيونداي ستاريا", defaultCapacity: 7 },
  HIACE: { label: "تويوتا هايس", defaultCapacity: 10 },
  COASTER: { label: "تويوتا كوستر", defaultCapacity: 21 },
  BUS: { label: "حافلة كبرى (باص سياحي)", defaultCapacity: 47 },
};

export default function TransportCatalogPage() {
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // حالة النموذج
  const [formData, setFormData] = useState({
    routeName: "",
    origin: "",
    destination: "",
    vehicleType: VehicleType.BUS as VehicleType,
    capacity: 47,
    baseCostSar: 1200,
    vatIncluded: true,
    seasonalNote: "",
    notes: "",
    isActive: true,
  });

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/transport-catalog");
      const data = await res.json();
      if (res.ok && data.items) {
        setRoutes(data.items);
      }
    } catch {
      setNotification({ type: "error", text: "تعذر تحميل دليل أسعار النقل من قاعدة البيانات." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleOpenAdd = () => {
    setEditingRoute(null);
    setFormData({
      routeName: "",
      origin: "",
      destination: "",
      vehicleType: VehicleType.BUS,
      capacity: 47,
      baseCostSar: 1200,
      vatIncluded: true,
      seasonalNote: "",
      notes: "",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (route: TransportRoute) => {
    setEditingRoute(route);
    setFormData({
      routeName: route.routeName,
      origin: route.origin || "",
      destination: route.destination || "",
      vehicleType: route.vehicleType,
      capacity: route.capacity,
      baseCostSar: route.baseCostSar,
      vatIncluded: route.vatIncluded,
      seasonalNote: route.seasonalNote || "",
      notes: route.notes || "",
      isActive: route.isActive,
    });
    setIsModalOpen(true);
  };

  const handleVehicleTypeChange = (type: VehicleType) => {
    setFormData((prev) => ({
      ...prev,
      vehicleType: type,
      capacity: VEHICLE_CAPACITIES[type]?.defaultCapacity || prev.capacity,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      const url = editingRoute
        ? `/api/transport-catalog/${editingRoute.id}`
        : "/api/transport-catalog";
      const method = editingRoute ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل حفظ المسار.");
      }

      setNotification({
        type: "success",
        text: editingRoute
          ? `تم تحديث مسار "${formData.routeName}" بنجاح.`
          : `تم إنشاء مسار "${formData.routeName}" بنجاح.`,
      });
      setIsModalOpen(false);
      fetchCatalog();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "حدث خطأ أثناء حفظ المسار.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف مسار "${name}" نهائياً من دليل النقل؟`)) return;

    try {
      const res = await fetch(`/api/transport-catalog/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotification({ type: "success", text: `تم حذف مسار "${name}" بنجاح.` });
        fetchCatalog();
      } else {
        const data = await res.json();
        throw new Error(data.error || "فشل الحذف.");
      }
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "حدث خطأ أثناء حذف المسار.",
      });
    }
  };

  // فلترة المسارات
  const filteredRoutes = routes.filter((r) => {
    const matchesFilter = filterType === "ALL" || r.vehicleType === filterType;
    const matchesSearch =
      r.routeName.toLowerCase().includes(search.toLowerCase()) ||
      (r.origin && r.origin.toLowerCase().includes(search.toLowerCase())) ||
      (r.destination && r.destination.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Bus className="w-6 h-6 text-emerald-700" />
            <span>دليل أسعار النقل والمركبات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            المسارات المعتمدة، فئات وسعات المركبات، والأسعار الصافية بالريال السعودي
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مسار أو مركبة جديدة</span>
        </button>
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
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* تنبيه مطابقة تسعيرة المورد المعتمدة */}
      <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>تقرير مطابقة وتدقيق تسعيرة النقل مع المورد المعتمد</span>
        </div>
        <p className="text-amber-800 leading-relaxed">
          الدليل النشط يحتوي حالياً على <strong>{routes.length} مساراً ومركبة</strong> موزعة على مختلف فئات النقل بين مطار جدة، مكة المكرمة، المدينة المنورة، ومحطات قطار الحرمين، بالإضافة إلى أجور الانتظار.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] font-medium text-amber-900">
          <span className="flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-amber-700" /> كافة الأسعار الأساسية شاملة لضريبة القيمة المضافة 15%
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-700" /> تسري زيادة المواسم (شعبان ورمضان) حسب الشروط المحددة لكل مسار
          </span>
        </div>
      </div>

      {/* شريط البحث والفلترة */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* حقل البحث */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم المسار، نقطة الانطلاق، أو وجهة الوصول..."
            className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50 focus:bg-white transition-all"
          />
        </div>

        {/* أزرار فئات المركبات */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors cursor-pointer ${
              filterType === "ALL"
                ? "bg-emerald-700 text-white font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            كافة المركبات ({routes.length})
          </button>
          {Object.keys(VEHICLE_CAPACITIES).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors cursor-pointer ${
                filterType === type
                  ? "bg-emerald-700 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {VEHICLE_CAPACITIES[type as VehicleType].label}
            </button>
          ))}
        </div>
      </div>

      {/* جدول مسارات النقل */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>جاري تحميل دليل مسارات النقل...</span>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            لا توجد مسارات تطابق البحث أو الفلتر المختار.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">المسار وخط السير</th>
                  <th className="px-4 py-3">نوع المركبة</th>
                  <th className="px-4 py-3">سعة الركاب</th>
                  <th className="px-4 py-3">السعر (ر.س)</th>
                  <th className="px-4 py-3">الضريبة والملاحظات الموسمية</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoutes.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{r.routeName}</div>
                      {(r.origin || r.destination) && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {r.origin || "نقطة الانطلاق"} ➔ {r.destination || "وجهة الوصول"}
                        </div>
                      )}
                      {r.notes && (
                        <div className="text-[10px] text-slate-400 italic mt-0.5">{r.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                        {VEHICLE_CAPACITIES[r.vehicleType]?.label || r.vehicleType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {r.capacity} معتمر
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-sm text-slate-900">
                        {r.baseCostSar.toLocaleString()} ر.س
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      {r.vatIncluded && (
                        <span className="inline-block text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded ml-1">
                          شامل VAT 15%
                        </span>
                      )}
                      {r.seasonalNote ? (
                        <span className="text-[11px] text-amber-800 font-medium block mt-0.5">
                          {r.seasonalNote}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">سعر قياسي</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {r.isActive ? "نشط" : "معطل"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="تعديل المسار"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id, r.routeName)}
                          className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف المسار"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* نافذة إضافة أو تعديل المسار */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-bold text-base text-slate-900">
                {editingRoute ? "تعديل مسار ومركبة نقل" : "إضافة مسار أو مركبة جديدة"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  اسم المسار *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مطار جدة ➔ فندق مكة المكرمة"
                  value={formData.routeName}
                  onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نقطة الانطلاق</label>
                  <input
                    type="text"
                    placeholder="مثال: مطار الملك عبد العزيز بجدة"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">وجهة الوصول</label>
                  <input
                    type="text"
                    placeholder="مثال: فندق مكة المكرمة"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نوع المركبة *</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => handleVehicleTypeChange(e.target.value as VehicleType)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    {Object.keys(VEHICLE_CAPACITIES).map((type) => (
                      <option key={type} value={type}>
                        {VEHICLE_CAPACITIES[type as VehicleType].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    سعة الركاب (مقعد) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    السعر الإجمالي (ر.س) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.baseCostSar}
                    onChange={(e) =>
                      setFormData({ ...formData, baseCostSar: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.vatIncluded}
                      onChange={(e) => setFormData({ ...formData, vatIncluded: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>شامل ضريبة 15% VAT</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  الملاحظات الموسمية وزيادات رمضان
                </label>
                <input
                  type="text"
                  placeholder="مثال: زيادة 20% خلال العشر الأواخر من رمضان"
                  value={formData.seasonalNote}
                  onChange={(e) => setFormData({ ...formData, seasonalNote: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  placeholder="ملاحظات المورد، أجور الانتظار، أو موديل السيارة..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="isActiveToggle" className="font-semibold text-slate-700 cursor-pointer">
                  تنشيط المسار في دليل التسعير وعروض المعتمرين
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-2xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingRoute ? "تحديث المسار" : "حفظ المسار"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
