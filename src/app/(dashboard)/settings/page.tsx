"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  Coins,
  Globe,
  Info,
  RefreshCw,
} from "lucide-react";

interface GlobalSettingsData {
  agencyName: string;
  agencyEmail: string;
  agencyPhone: string;
  agencyAddress: string;
  defaultVisaCostSar: number;
  sarToMadRate: number;
  eurToMadRate: number;
  documentFooterText?: string | null;
  quotationTerms?: string | null;
  updatedAt?: string;
}

export default function GlobalSettingsPage() {
  const [formData, setFormData] = useState<GlobalSettingsData>({
    agencyName: "شركة مثابة لخدمات العمرة والأسفار",
    agencyEmail: "contact@mathaba.agency",
    agencyPhone: "+212 522 000 000",
    agencyAddress: "الدار البيضاء، المغرب",
    defaultVisaCostSar: 525,
    sarToMadRate: 2.7,
    eurToMadRate: 10.85,
    documentFooterText: "شركة مثابة لخدمات العمرة والأسفار — معتمدون من وزارة السياحة والأوقاف",
    quotationTerms: "صلاحية جواز السفر لا تقل عن 6 أشهر من تاريخ السفر.\nالأسعار شاملة لرسوم التأشيرة والضرائب المعمول بها بالمملكة العربية السعودية.\nتخضع مواعيد الدخول والخروج لسياسات الفنادق المعتمدة.",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (res.ok && data.settings) {
        setFormData({
          agencyName: data.settings.agencyName || "",
          agencyEmail: data.settings.agencyEmail || "",
          agencyPhone: data.settings.agencyPhone || "",
          agencyAddress: data.settings.agencyAddress || "",
          defaultVisaCostSar: data.settings.defaultVisaCostSar ?? 525,
          sarToMadRate: data.settings.sarToMadRate ?? 2.7,
          eurToMadRate: data.settings.eurToMadRate ?? 10.85,
          documentFooterText: data.settings.documentFooterText || "",
          quotationTerms: data.settings.quotationTerms || "",
          updatedAt: data.settings.updatedAt,
        });
      }
    } catch {
      setMessage({ type: "error", text: "تعذر الاتصال بقاعدة البيانات لجلب الإعدادات." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "فشل في حفظ الإعدادات");
      }

      setMessage({ type: "success", text: "تم حفظ الإعدادات العامة للوكالة بنجاح!" });
      if (data.settings?.updatedAt) {
        setFormData((prev) => ({ ...prev, updatedAt: data.settings.updatedAt }));
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء حفظ الإعدادات.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span>جاري تحميل الإعدادات العامة للوكالة...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-emerald-700" />
            <span>الإعدادات العامة للوكالة</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ضبط الأسعار المرجعية لرسوم التأشيرة وأسعار الصرف وهوية الوكالة الرسمية
          </p>
        </div>

        {formData.updatedAt && (
          <div className="text-start sm:text-end text-[11px] text-slate-400">
            آخر تحديث: {new Date(formData.updatedAt).toLocaleDateString("ar-MA")} في{" "}
            {new Date(formData.updatedAt).toLocaleTimeString("ar-MA")}
          </div>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* تنبيه قاعدة الحماية التاريخية */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">قاعدة الحماية التاريخية لأسعار الرحلات:</p>
          <p className="text-amber-800 leading-relaxed">
            أسعار الصرف ورسوم التأشيرة المحددة هنا تُعد <strong>قيماً افتراضية تبدأ بها الرحلات الجديدة فقط</strong>.
            الرحلات الحالية وعروض الأسعار المعتمدة تحتفظ بأسعارها التاريخية المحصنة ولن تتأثر إطلاقاً عند تعديل هذه الإعدادات العامة.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* القسم 1: هوية الوكالة وبيانات الاتصال */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">هوية الوكالة وبيانات الاتصال</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                اسم وكالة الأسفار
              </label>
              <input
                type="text"
                required
                value={formData.agencyName}
                onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="شركة مثابة لخدمات العمرة"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                البريد الإلكتروني الرسمي للوكالة
              </label>
              <input
                type="email"
                value={formData.agencyEmail}
                onChange={(e) => setFormData({ ...formData, agencyEmail: e.target.value })}
                placeholder="contact@agency.com"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                رقم الهاتف / الواتساب
              </label>
              <input
                type="text"
                value={formData.agencyPhone}
                onChange={(e) => setFormData({ ...formData, agencyPhone: e.target.value })}
                placeholder="+212 5..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                عنوان المقر الرئيسي
              </label>
              <input
                type="text"
                value={formData.agencyAddress}
                onChange={(e) => setFormData({ ...formData, agencyAddress: e.target.value })}
                placeholder="الدار البيضاء، المغرب"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* القسم 2: تسعير التأشيرات المرجعي */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Coins className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">سعر التأشيرة المرجعي</h2>
          </div>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رسوم تأشيرة العمرة الافتراضية (بالريال السعودي لكل معتمر)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.defaultVisaCostSar}
                onChange={(e) =>
                  setFormData({ ...formData, defaultVisaCostSar: parseFloat(e.target.value) || 0 })
                }
                className="w-full pl-3 pr-14 py-2 text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ر.س
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              السعر المرجعي الأساسي: 525.00 ريال سعودي لكل معتمر. يُطبق تلقائياً كقيمة أولية عند إنشاء رحلات جديدة.
            </p>
          </div>
        </div>

        {/* القسم 3: أسعار الصرف المرجعية */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Globe className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">أسعار الصرف المرجعية (مقابل الدرهم المغربي)</h2>
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
                  className="w-full pl-3 pr-14 py-2 text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  د.م.
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                قيمة 1 ريال سعودي بالدرهم المغربي (الافتراضي: 2.70 د.م.).
              </p>
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
                  className="w-full pl-3 pr-14 py-2 text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  د.م.
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                قيمة 1 يورو بالدرهم المغربي (الافتراضي: 10.85 د.م.).
              </p>
            </div>
          </div>
        </div>

        {/* القسم 4: هوية الوثائق والشروط الرسمية */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Info className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">هوية الوثائق والشروط الرسمية (عروض الأسعار والتقارير)</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نص التذييل الرسمي في الوثائق
              </label>
              <input
                type="text"
                value={formData.documentFooterText || ""}
                onChange={(e) => setFormData({ ...formData, documentFooterText: e.target.value })}
                placeholder="شركة مثابة لخدمات العمرة والأسفار — معتمدون من وزارة السياحة والأوقاف"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                يظهر أسفل جميع عروض الأسعار والتقارير المالية المطبوعة والمصدرة بصيغة PDF.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                الشروط والأحكام الافتراضية لعروض المعتمرين
              </label>
              <textarea
                rows={3}
                value={formData.quotationTerms || ""}
                onChange={(e) => setFormData({ ...formData, quotationTerms: e.target.value })}
                placeholder="شروط الجواز، التأشيرة، والإلغاء..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-sans leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                البنود والضوابط المطبوعة تلقائياً في عروض الأسعار الرسمية الموجهة للمعتمرين.
              </p>
            </div>
          </div>
        </div>

        {/* زر الحفظ */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ الإعدادات العامة</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
