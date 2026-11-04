"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Trash2,
  Copy,
  Plus,
  Compass,
  Layers,
  Building2,
  Bus,
  Train,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Archive,
  RefreshCw,
  Coins,
  ShieldCheck,
  Percent,
  X,
  Car,
  FileText,
  UserCheck,
  Info,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { RoomCategory, QuoteStatus, CustomizationType, VehicleType } from "@prisma/client";
import { VEHICLE_CAPACITIES } from "@/core/finance/calculator";
import { DocumentViewerModal } from "@/components/documents/document-viewer-modal";

interface CustomizationItem {
  id: string;
  quoteId: string;
  type: CustomizationType;
  description: string;
  supplierCostDeltaMad: number;
  sellingPriceDeltaMad: number;
  details?: any;
  createdAt: string;
}

interface QuoteDetail {
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
  adjustmentReason?: string | null;
  status: QuoteStatus;
  snapshotData?: any;
  createdAt: string;
  updatedAt: string;
  customizations: CustomizationItem[];
  originalBaseline: {
    roomCategory: RoomCategory;
    hotelCostMad: number;
    flightCostMad: number;
    groupBusCostMad: number;
    additionalTransportCostMad: number;
    trainCostMad: number;
    visaCostMad: number;
    servicesCostMad: number;
    totalActualCostMad: number;
    configuredProfitMad: number;
    sellingPriceBeforeDiscountMad: number;
    discountMad: number;
    finalSellingPriceMad: number;
    effectiveProfitMad: number;
  };
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
}

interface CatalogRouteItem {
  id: string;
  routeName: string;
  vehicleType: VehicleType;
  capacity: number;
  baseCostSar: number;
}

export default function QuoteCustomizerPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = use(params);
  const router = useRouter();
  const { t, language } = useLanguage();

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogRouteItem[]>([]);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable Form State
  const [pilgrimName, setPilgrimName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [roomCategory, setRoomCategory] = useState<RoomCategory>(RoomCategory.DOUBLE);
  const [overrideProfitMad, setOverrideProfitMad] = useState<string>("");
  const [commercialDiscountMad, setCommercialDiscountMad] = useState<number>(0);
  const [arbitraryAdjustmentMad, setArbitraryAdjustmentMad] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [status, setStatus] = useState<QuoteStatus>(QuoteStatus.DRAFT);

  // Document Viewer Modal State (Phase 6)
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [docViewerDocType, setDocViewerDocType] = useState<"quotation" | "internal_report">("quotation");

  // Modal State for adding exception
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"TRANSPORT" | "REMOVE" | "REPLACE" | "ADDON" | "EXPENSE">("TRANSPORT");

  // Private Transport Form
  const [ptSelectedRouteId, setPtSelectedRouteId] = useState("");
  const [ptRouteName, setPtRouteName] = useState("");
  const [ptVehicleType, setPtVehicleType] = useState<VehicleType>(VehicleType.GMC);
  const [ptVehicleCostSar, setPtVehicleCostSar] = useState<number>(600);
  const [ptPassengersSharing, setPtPassengersSharing] = useState<number>(3);

  // Remove Service Form
  const [rmServiceName, setRmServiceName] = useState("");
  const [rmIsRecoverable, setRmIsRecoverable] = useState(true);
  const [rmCostReductionMad, setRmCostReductionMad] = useState<number>(200);
  const [rmCommercialDiscountMad, setRmCommercialDiscountMad] = useState<number>(0);

  // Replace Service Form
  const [rpOriginalName, setRpOriginalName] = useState("");
  const [rpReplacementName, setRpReplacementName] = useState("");
  const [rpReductionMad, setRpReductionMad] = useState<number>(150);
  const [rpAdditionMad, setRpAdditionMad] = useState<number>(350);

  // Add Service Form
  const [adServiceName, setAdServiceName] = useState("");
  const [adCostMad, setAdCostMad] = useState<number>(300);

  // Custom Expense Form
  const [cxDescription, setCxDescription] = useState("");
  const [cxCostMad, setCxCostMad] = useState<number>(0);

  // Fetch quote details
  const fetchQuoteDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quotes/${quoteId}`);
      if (!res.ok) throw new Error("Failed to load quote details");
      const data = await res.json();
      const q: QuoteDetail = data.quote;
      setQuote(q);

      setPilgrimName(q.pilgrimName);
      setContactPhone(q.contactPhone || "");
      setRoomCategory(q.roomCategory);
      setOverrideProfitMad(q.overrideProfitMad !== null && q.overrideProfitMad !== undefined ? String(q.overrideProfitMad) : "");
      setCommercialDiscountMad(q.commercialDiscountMad);
      setArbitraryAdjustmentMad(q.arbitraryAdjustmentMad);
      setAdjustmentReason(q.adjustmentReason || "");
      setStatus(q.status);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to load quote" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch transport catalog for quick-selection
  const fetchCatalog = async () => {
    try {
      const res = await fetch("/api/transport-catalog");
      if (res.ok) {
        const data = await res.json();
        setCatalogItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQuoteDetails();
    fetchCatalog();
  }, [quoteId]);

  // Handle Catalog Selection
  const handleSelectCatalog = (catalogId: string) => {
    setPtSelectedRouteId(catalogId);
    const item = catalogItems.find((c) => c.id === catalogId);
    if (item) {
      setPtRouteName(item.routeName);
      setPtVehicleType(item.vehicleType);
      setPtVehicleCostSar(Number(item.baseCostSar));
      // Suggested default sharing: capacity or 3
      setPtPassengersSharing(Math.min(item.capacity, 3));
    }
  };

  // Save Quote Changes
  const handleSaveQuote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pilgrimName: pilgrimName.trim(),
          contactPhone: contactPhone.trim() || null,
          roomCategory,
          overrideProfitMad: overrideProfitMad !== "" ? Number(overrideProfitMad) : null,
          commercialDiscountMad: Number(commercialDiscountMad) || 0,
          arbitraryAdjustmentMad: Number(arbitraryAdjustmentMad) || 0,
          adjustmentReason: adjustmentReason.trim() || null,
          status,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save quote");
      }

      setNotification({
        type: "success",
        text: language === "ar" ? "تم حفظ بيانات وتعديلات العرض المخصص بنجاح!" : "Customized quote saved successfully!",
      });
      fetchQuoteDetails();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Error saving quote" });
    } finally {
      setSaving(false);
    }
  };

  // Change room category with instant recalculation
  const handleRoomCategoryChange = async (newCat: RoomCategory) => {
    setRoomCategory(newCat);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCategory: newCat }),
      });
      if (res.ok) {
        fetchQuoteDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Customization Item
  const handleAddCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let payload: any = null;
      const sarRate = Number(quote?.snapshotData?.sarToMadRate || 2.70);

      if (modalTab === "TRANSPORT") {
        const totalCostSar = Number(ptVehicleCostSar);
        const paxSharing = Math.max(1, Number(ptPassengersSharing));
        const perPaxSar = totalCostSar / paxSharing;
        const perPaxMad = Math.round(perPaxSar * sarRate * 100) / 100;

        payload = {
          type: CustomizationType.ADD_PRIVATE_TRANSPORT,
          description: `${ptRouteName || "سيارة خاصة"} (${ptVehicleType}) — ${paxSharing} معتمرين`,
          supplierCostDeltaMad: perPaxMad,
          sellingPriceDeltaMad: perPaxMad,
          details: {
            routeId: ptSelectedRouteId || undefined,
            routeName: ptRouteName,
            vehicleType: ptVehicleType,
            vehicleCostSar: totalCostSar,
            passengersSharing: paxSharing,
            perPersonCostSar: perPaxSar,
            perPersonCostMad: perPaxMad,
          },
        };
      } else if (modalTab === "REMOVE") {
        const reductionMad = rmIsRecoverable ? Number(rmCostReductionMad) : 0;
        const discountMad = !rmIsRecoverable ? Number(rmCommercialDiscountMad) : 0;

        payload = {
          type: CustomizationType.REMOVE_SERVICE,
          description: `إلغاء: ${rmServiceName} ${!rmIsRecoverable ? "(غير مسترد — خصم تجاري)" : ""}`,
          supplierCostDeltaMad: -reductionMad,
          sellingPriceDeltaMad: -(reductionMad + discountMad),
          details: {
            originalServiceName: rmServiceName,
            isRecoverable: rmIsRecoverable,
            supplierCostReductionMad: reductionMad,
            commercialDiscountMad: discountMad,
          },
        };
      } else if (modalTab === "REPLACE") {
        const redMad = Number(rpReductionMad);
        const addMad = Number(rpAdditionMad);
        const netDelta = addMad - redMad;

        payload = {
          type: CustomizationType.REPLACE_SERVICE,
          description: `استبدال ${rpOriginalName} بـ ${rpReplacementName}`,
          supplierCostDeltaMad: netDelta,
          sellingPriceDeltaMad: netDelta,
          details: {
            originalServiceName: rpOriginalName,
            replacementServiceName: rpReplacementName,
            supplierCostReductionMad: redMad,
            supplierCostAdditionMad: addMad,
          },
        };
      } else if (modalTab === "ADDON") {
        const cost = Number(adCostMad);
        payload = {
          type: CustomizationType.ADD_SERVICE,
          description: `إضافة خدمة: ${adServiceName}`,
          supplierCostDeltaMad: cost,
          sellingPriceDeltaMad: cost,
          details: {
            originalServiceName: adServiceName,
            supplierCostAdditionMad: cost,
          },
        };
      } else if (modalTab === "EXPENSE") {
        const cost = Number(cxCostMad);
        payload = {
          type: CustomizationType.CUSTOM_EXPENSE,
          description: cxDescription,
          supplierCostDeltaMad: cost,
          sellingPriceDeltaMad: cost,
        };
      }

      const res = await fetch(`/api/quotes/${quoteId}/customizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add customization");
      }

      setIsAddModalOpen(false);
      fetchQuoteDetails();
      setNotification({
        type: "success",
        text: language === "ar" ? "تمت إضافة بند الاستثناء بنجاح!" : "Exception item added successfully!",
      });
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to add customization" });
    }
  };

  // Delete Customization Item
  const handleDeleteCustomization = async (itemId: string, desc: string) => {
    if (!confirm(language === "ar" ? `هل تريد بالتأكيد إزالة بند "${desc}"؟` : `Remove item "${desc}"?`)) return;
    try {
      const res = await fetch(`/api/quotes/${quoteId}/customizations/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete item");
      fetchQuoteDetails();
      setNotification({
        type: "success",
        text: t("customizationDeletedSuccess"),
      });
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to delete item" });
    }
  };

  // Duplicate Quote
  const handleDuplicateQuote = async () => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pilgrimName: `${pilgrimName} (نسخة مكررة)`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Duplicate failed");
      router.push(`/quotes/${data.quote.id}`);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Duplicate failed" });
    }
  };

  // Delete Quote
  const handleDeleteQuote = async () => {
    if (!confirm(language === "ar" ? "هل تريد بالتأكيد حذف هذا العرض المخصص بالكامل؟" : "Delete this quote?")) return;
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete quote");
      router.push(`/trips/${quote?.tripId}/offers/${quote?.offerId}`);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to delete" });
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
        <p className="font-semibold text-slate-700">{t("loading")}</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="font-bold text-slate-800">العرض غير موجود أو تم حذفه</p>
        <Link href="/quotes" className="text-emerald-700 underline mt-2 inline-block">
          العودة لقائمة العروض
        </Link>
      </div>
    );
  }

  const sarRate = Number(quote.snapshotData?.sarToMadRate || 2.70);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Deficit Alert Warning Banner */}
      {quote.calculation.isDeficit && (
        <div className="p-4 rounded-2xl bg-rose-500 text-white shadow-lg flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">
                {t("deficitAlert")}
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                سعر البيع النهائي ({quote.calculation.finalSellingPriceMad.toLocaleString()} د.م.) أقل من التكلفة الفعلية للموردين ({quote.calculation.newActualCostMad.toLocaleString()} د.م.). العجز المالي: {Math.abs(quote.calculation.realizedProfitMad).toLocaleString()} د.م.!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href={`/trips/${quote.tripId}`} className="hover:text-emerald-700 transition-colors">
              {quote.tripName}
            </Link>
            <span>/</span>
            <Link
              href={`/trips/${quote.tripId}/offers/${quote.offerId}`}
              className="hover:text-emerald-700 transition-colors"
            >
              {quote.offerName}
            </Link>
            <span>/</span>
            <span className="font-bold text-emerald-800">{quote.pilgrimName}</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {quote.pilgrimName}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {language === "ar" ? "حالة استثنائية فردية" : "Individual Exception"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setDocViewerDocType("quotation");
              setIsDocViewerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            title={t("previewCustomerQuotation")}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t("previewCustomerQuotation")}</span>
          </button>

          <button
            onClick={() => {
              setDocViewerDocType("internal_report");
              setIsDocViewerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            title={t("internalFinancialReport")}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t("internalFinancialReport")}</span>
          </button>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as QuoteStatus)}
            className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
          >
            <option value={QuoteStatus.DRAFT}>{t("draftStatus")}</option>
            <option value={QuoteStatus.CONFIRMED}>{t("finalizedStatus")}</option>
            <option value={QuoteStatus.CANCELLED}>{language === "ar" ? "ملغي" : "Cancelled"}</option>
            <option value={QuoteStatus.ARCHIVED}>{t("archivedStatus")}</option>
          </select>

          <button
            onClick={() => handleSaveQuote()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? t("saving") : t("save")}</span>
          </button>

          <button
            onClick={handleDuplicateQuote}
            className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            title={t("duplicateQuoteTitle")}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t("duplicate")}</span>
          </button>

          <button
            onClick={handleDeleteQuote}
            className="p-2 border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-700 rounded-xl transition-colors cursor-pointer"
            title={t("delete")}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <Link
            href={`/trips/${quote.tripId}/offers/${quote.offerId}`}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors"
            title="رجوع للباقة"
          >
            <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
          </Link>
        </div>
      </div>

      {/* Snapshot Protection Notice */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            {language === "ar"
              ? `الحماية التاريخية نشطة: تم تجميد نسخة الباقة الأصلية (صرف الريال: ${sarRate} د.م.) لحماية تسعيرة هذا المعتمر من أي تعديل مستقبلي في الإعدادات العامة.`
              : `Historical snapshot protection active. Frozen exchange rate: ${sarRate} MAD.`}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: Comparison Matrix (Original Baseline vs Customized)  */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                {t("comparisonOriginalVsCustom")}
              </h2>
              <p className="text-[11px] text-slate-500">
                المقارنة اللحظية بين الباقة الجماعية الأصلية وتسعير المعتمر الفردي المعدل
              </p>
            </div>
          </div>

          {/* Room Category Switcher Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
            {(["SINGLE", "DOUBLE", "TRIPLE", "QUAD"] as RoomCategory[]).map((cat) => {
              const isSelected = roomCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleRoomCategoryChange(cat)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white text-emerald-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {cat === "SINGLE" && "فردي (1)"}
                  {cat === "DOUBLE" && "ثنائي (2)"}
                  {cat === "TRIPLE" && "ثلاثي (3)"}
                  {cat === "QUAD" && "رباعي (4)"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparative Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 rtl:divide-x-reverse text-xs">
          {/* 1. Base Actual Cost vs New Actual Cost */}
          <div className="p-4 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              التكلفة الفعلية للموردين
            </span>
            <div className="text-lg font-black text-slate-800">
              {quote.calculation.newActualCostMad.toLocaleString()} {t("currencyMad")}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>الأصل:</span>
              <span className="line-through">{quote.calculation.baseCostMad.toLocaleString()} {t("currencyMad")}</span>
              {quote.calculation.supplierCostDeltaMad !== 0 && (
                <span
                  className={`font-bold ${
                    quote.calculation.supplierCostDeltaMad > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  ({quote.calculation.supplierCostDeltaMad > 0 ? "+" : ""}
                  {quote.calculation.supplierCostDeltaMad.toLocaleString()})
                </span>
              )}
            </div>
          </div>

          {/* 2. Configured Profit */}
          <div className="p-4 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              هامش الربح المحدد
            </span>
            <div className="text-lg font-black text-emerald-700">
              {quote.calculation.baseProfitMad.toLocaleString()} {t("currencyMad")}
            </div>
            <div className="text-[11px] text-slate-500">
              {quote.calculation.isProfitOverridden ? (
                <span className="text-amber-700 font-bold">معدل يدوياً لهذا المعتمر</span>
              ) : (
                <span>موروث من الباقة الأصلية</span>
              )}
            </div>
          </div>

          {/* 3. Commercial Discount */}
          <div className="p-4 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              الخصم التجاري الممنوح
            </span>
            <div className="text-lg font-black text-amber-700">
              {quote.calculation.appliedDiscountMad.toLocaleString()} {t("currencyMad")}
            </div>
            <div className="text-[11px] text-slate-500">
              {quote.calculation.appliedDiscountMad > 0 ? "تخفيض من سعر البيع" : "بدون خصم"}
            </div>
          </div>

          {/* 4. Final Selling Price & Realized Profit */}
          <div className={`p-4 space-y-1 ${quote.calculation.isDeficit ? "bg-rose-50" : "bg-emerald-50/40"}`}>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              سعر البيع النهائي للمعتمر
            </span>
            <div className="text-xl font-black text-slate-900">
              {quote.calculation.finalSellingPriceMad.toLocaleString()} {t("currencyMad")}
            </div>
            <div className="text-[11px] flex items-center gap-1 font-bold">
              <span>الربح الصافي:</span>
              <span className={quote.calculation.realizedProfitMad >= 0 ? "text-emerald-700" : "text-rose-600"}>
                {quote.calculation.realizedProfitMad.toLocaleString()} {t("currencyMad")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 2: Pilgrim Details & Financial Parameters               */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <UserCheck className="w-5 h-5 text-emerald-700" />
          <h2 className="font-bold text-sm text-slate-900">بيانات المعتمر وتعديلات الربح والخصم</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t("pilgrimName")} *</label>
            <input
              type="text"
              required
              value={pilgrimName}
              onChange={(e) => setPilgrimName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-semibold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t("contactPhone")}</label>
            <input
              type="text"
              placeholder="+212 ..."
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              تعديل هامش الربح (د.م.)
            </label>
            <input
              type="number"
              min="0"
              step="50"
              placeholder={`الافتراضي: ${quote.originalBaseline.configuredProfitMad}`}
              value={overrideProfitMad}
              onChange={(e) => setOverrideProfitMad(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-bold text-emerald-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              الخصم التجاري الممنوح (د.م.)
            </label>
            <input
              type="number"
              min="0"
              step="50"
              value={commercialDiscountMad}
              onChange={(e) => setCommercialDiscountMad(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-bold text-amber-800"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">{t("adjustmentReason")}</label>
          <input
            type="text"
            placeholder="مثال: ترقية فردية للغرفة، سيارة خاصة للمطار، خصم عائلي خاص..."
            value={adjustmentReason}
            onChange={(e) => setAdjustmentReason(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 3: Customization Items (The 7 Exception Types)          */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="font-bold text-sm text-slate-900">{t("customizationItems")}</h2>
              <p className="text-[11px] text-slate-500">
                إضافة سيارات خاصة، إلغاء أو استبدال خدمات، ومصاريف الموردين المخصصة
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t("addCustomization")}</span>
          </button>
        </div>

        {/* Group Bus Reminder Notice */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{t("groupBusProtectionNotice")}</span>
        </div>

        {/* Customizations Table / Cards */}
        {quote.customizations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl space-y-1">
            <Car className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">لا توجد بنود استثناءات مضافة لهذا المعتمر</p>
            <p className="text-[11px] text-slate-400">
              اضغط على زر &quot;{t("addCustomization")}&quot; لإضافة سيارة خاصة أو تعديل خدمة.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 text-start">النوع</th>
                  <th className="py-2.5 px-3 text-start">الوصف والتفاصيل</th>
                  <th className="py-2.5 px-3 text-end">تغيير تكلفة المورد (د.م.)</th>
                  <th className="py-2.5 px-3 text-center">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quote.customizations.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                          {item.type === CustomizationType.ADD_PRIVATE_TRANSPORT && "سيارة خاصة"}
                          {item.type === CustomizationType.REMOVE_SERVICE && "إلغاء خدمة"}
                          {item.type === CustomizationType.REPLACE_SERVICE && "استبدال خدمة"}
                          {item.type === CustomizationType.ADD_SERVICE && "إضافة خدمة"}
                          {item.type === CustomizationType.CUSTOM_EXPENSE && "مصروف مخصص"}
                          {item.type === CustomizationType.ADDON && "Add-on"}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{item.description}</div>
                        {item.details && (
                          <div className="text-[10px] text-slate-500 mt-0.5 space-x-2 rtl:space-x-reverse">
                            {item.details.vehicleCostSar && (
                              <span>إجمالي المركبة: {item.details.vehicleCostSar} ر.س</span>
                            )}
                            {item.details.passengersSharing && (
                              <span>مقسم على: {item.details.passengersSharing} معتمرين</span>
                            )}
                            {item.details.commercialDiscountMad > 0 && (
                              <span className="text-amber-700 font-bold">
                                خصم تجاري: {item.details.commercialDiscountMad} د.م.
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-end">
                        <span
                          className={`font-black text-xs ${
                            item.supplierCostDeltaMad > 0
                              ? "text-rose-600"
                              : item.supplierCostDeltaMad < 0
                              ? "text-emerald-700"
                              : "text-slate-600"
                          }`}
                        >
                          {item.supplierCostDeltaMad > 0 ? "+" : ""}
                          {item.supplierCostDeltaMad.toLocaleString()} {t("currencyMad")}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleDeleteCustomization(item.id, item.description)}
                          className="p-1 text-slate-400 hover:text-rose-700 transition-colors"
                          title="حذف هذا البند"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: Add Customization Item (The 7 Types)                    */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">{t("addCustomization")}</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Type Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setModalTab("TRANSPORT")}
                className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
                  modalTab === "TRANSPORT"
                    ? "border-emerald-600 text-emerald-800 bg-white font-bold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                سيارة خاصة
              </button>
              <button
                type="button"
                onClick={() => setModalTab("REMOVE")}
                className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
                  modalTab === "REMOVE"
                    ? "border-emerald-600 text-emerald-800 bg-white font-bold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                إلغاء خدمة
              </button>
              <button
                type="button"
                onClick={() => setModalTab("REPLACE")}
                className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
                  modalTab === "REPLACE"
                    ? "border-emerald-600 text-emerald-800 bg-white font-bold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                استبدال خدمة
              </button>
              <button
                type="button"
                onClick={() => setModalTab("ADDON")}
                className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
                  modalTab === "ADDON"
                    ? "border-emerald-600 text-emerald-800 bg-white font-bold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                إضافة خدمة
              </button>
              <button
                type="button"
                onClick={() => setModalTab("EXPENSE")}
                className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
                  modalTab === "EXPENSE"
                    ? "border-emerald-600 text-emerald-800 bg-white font-bold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                مصروف مخصص
              </button>
            </div>

            <form onSubmit={handleAddCustomization} className="p-6 space-y-4 text-xs">
              {/* TAB 1: Private Transport */}
              {modalTab === "TRANSPORT" && (
                <div className="space-y-4">
                  {catalogItems.length > 0 && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        اختيار من دليل أسعار النقل المعتمد
                      </label>
                      <select
                        onChange={(e) => handleSelectCatalog(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 bg-white"
                      >
                        <option value="">-- اختر مساراً لملء السعر والبيانات تلقائياً --</option>
                        {catalogItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.routeName} ({item.vehicleType}) — {item.baseCostSar} ر.س
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">اسم المسار / النقل *</label>
                    <input
                      type="text"
                      required
                      value={ptRouteName}
                      onChange={(e) => setPtRouteName(e.target.value)}
                      placeholder="مثال: مطار جدة - فندق مكة (GMC خاصة)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">نوع المركبة *</label>
                      <select
                        value={ptVehicleType}
                        onChange={(e) => setPtVehicleType(e.target.value as VehicleType)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 bg-white"
                      >
                        <option value={VehicleType.SEDAN}>Sedan (4 ركاب)</option>
                        <option value={VehicleType.GMC}>GMC (7 ركاب)</option>
                        <option value={VehicleType.STARIA}>Staria (7 ركاب)</option>
                        <option value={VehicleType.HIACE}>Hiace (10 ركاب)</option>
                        <option value={VehicleType.COASTER}>Coaster (21 راكب)</option>
                        <option value={VehicleType.BUS}>Bus (47 راكب)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        تكلفة المركبة الإجمالية (ر.س) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="10"
                        value={ptVehicleCostSar}
                        onChange={(e) => setPtVehicleCostSar(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      عدد المعتمرين المشتركين في هذه المركبة *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={VEHICLE_CAPACITIES[ptVehicleType] || 7}
                      value={ptPassengersSharing}
                      onChange={(e) => setPtPassengersSharing(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-bold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      السعة القصوى للمركبة المختارة: {VEHICLE_CAPACITIES[ptVehicleType] || 7} ركاب.
                    </p>
                  </div>

                  {/* Allocation Preview Box */}
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-900 block">نصيب المعتمر الواحد المحسوب:</span>
                      <span className="text-[10px] text-emerald-700">
                        {ptVehicleCostSar} ر.س ÷ {ptPassengersSharing} = {(ptVehicleCostSar / Math.max(1, ptPassengersSharing)).toFixed(2)} ر.س
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-emerald-800">
                        {Math.round((ptVehicleCostSar / Math.max(1, ptPassengersSharing)) * sarRate * 100) / 100} د.م.
                      </span>
                      <span className="text-[10px] text-emerald-600 block">تُضاف للتكلفة الفعلية</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                    تذكير نظام الحساب: لا يتم حذف حافلة المجموعة تلقائياً لضمان عدم حدوث عجز جماعي.
                  </div>
                </div>
              )}

              {/* TAB 2: Remove Service */}
              {modalTab === "REMOVE" && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">اسم الخدمة المراد إلغاؤها *</label>
                    <input
                      type="text"
                      required
                      value={rmServiceName}
                      onChange={(e) => setRmServiceName(e.target.value)}
                      placeholder="مثال: زيارات مكة، وجبة إفطار، تذكرة قطار..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="block font-bold text-slate-800">هل التكلفة مستردة من المورد فعلياً؟</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isRecoverable"
                          checked={rmIsRecoverable}
                          onChange={() => setRmIsRecoverable(true)}
                          className="w-4 h-4 text-emerald-600"
                        />
                        <span className="font-semibold text-slate-700">نعم — تخفيض حقيقي من تكلفة المورد</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isRecoverable"
                          checked={!rmIsRecoverable}
                          onChange={() => setRmIsRecoverable(false)}
                          className="w-4 h-4 text-emerald-600"
                        />
                        <span className="font-semibold text-slate-700">لا — غير مستردة (خصم تجاري فقط)</span>
                      </label>
                    </div>
                  </div>

                  {rmIsRecoverable ? (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        مبلغ التكلفة المستردة من المورد (د.م.) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="10"
                        value={rmCostReductionMad}
                        onChange={(e) => setRmCostReductionMad(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-bold text-emerald-700"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">يُخصم هذا المبلغ مباشرة من التكلفة الفعلية للمورد.</p>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        الخصم التجاري الممنوح للمعتمر مقابل الإلغاء (د.م.) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="10"
                        value={rmCommercialDiscountMad}
                        onChange={(e) => setRmCommercialDiscountMad(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-bold text-amber-700"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        لا يُخصم من تكلفة المورد بل يقلل من هامش ربح الوكالة كخصم تجاري.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Replace Service */}
              {modalTab === "REPLACE" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">الخدمة الأصلية الملغاة *</label>
                      <input
                        type="text"
                        required
                        value={rpOriginalName}
                        onChange={(e) => setRpOriginalName(e.target.value)}
                        placeholder="مثال: إفطار عادي"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">الخدمة البديلة الجديدة *</label>
                      <input
                        type="text"
                        required
                        value={rpReplacementName}
                        onChange={(e) => setRpReplacementName(e.target.value)}
                        placeholder="مثال: بوفيه مفتوح فاخر VIP"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        تكلفة الخدمة الأصلية المستردة (د.م.) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="10"
                        value={rpReductionMad}
                        onChange={(e) => setRpReductionMad(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-bold text-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        تكلفة الخدمة البديلة الجديدة (د.م.) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="10"
                        value={rpAdditionMad}
                        onChange={(e) => setRpAdditionMad(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-bold text-rose-700"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">صافي فارق التكلفة للمورد:</span>
                    <span className={`font-black text-sm ${rpAdditionMad - rpReductionMad >= 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      {rpAdditionMad - rpReductionMad >= 0 ? "+" : ""}
                      {(rpAdditionMad - rpReductionMad).toFixed(2)} د.م.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 4: Add Service */}
              {modalTab === "ADDON" && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">اسم الخدمة أو المصروف الإضافي *</label>
                    <input
                      type="text"
                      required
                      value={adServiceName}
                      onChange={(e) => setAdServiceName(e.target.value)}
                      placeholder="مثال: استقبال خاص في الصالة الملكية، تأمين إضافي..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">تكلفة المورد الإضافية (د.م.) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="10"
                      value={adCostMad}
                      onChange={(e) => setAdCostMad(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-bold"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: Custom Expense */}
              {modalTab === "EXPENSE" && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">وصف المصروف المحدد يدوياً *</label>
                    <input
                      type="text"
                      required
                      value={cxDescription}
                      onChange={(e) => setCxDescription(e.target.value)}
                      placeholder="وصف المصروف أو التسوية المالية الخاصة"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      المبلغ بالدرهم المغربي (موجب للإضافة، سالب للخصم) *
                    </label>
                    <input
                      type="number"
                      required
                      step="10"
                      value={cxCostMad}
                      onChange={(e) => setCxCostMad(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  إضافة الاستثناء وتحديث السعر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Document Viewer Modal (Phase 6) */}
      {isDocViewerOpen && (
        <DocumentViewerModal
          isOpen={isDocViewerOpen}
          onClose={() => setIsDocViewerOpen(false)}
          targetType="quote"
          targetId={quote.id}
          initialDocType={docViewerDocType}
        />
      )}
    </div>
  );
}
