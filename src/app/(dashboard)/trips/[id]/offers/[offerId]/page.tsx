"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  ArrowLeft,
  Calendar,
  Building2,
  Coins,
  Save,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  ArrowRight,
  TrendingUp,
  X,
} from "lucide-react";
import { City } from "@prisma/client";
import { useLanguage } from "@/lib/i18n/language-context";

interface HotelStay {
  id: string;
  city: City;
  hotelName: string;
  checkInDate: string;
  checkOutDate: string;
  nightsCount: number;
  isNightsOverridden: boolean;
  singleDoubleRateSar: number;
  tripleRateSar: number;
  quadRateSar: number;
  notes?: string | null;
}

interface RoomBreakdownItem {
  roomCategory: "SINGLE" | "DOUBLE" | "TRIPLE" | "QUAD";
  occupancy: number;
  hotelCostMad: number;
  flightCostMad: number;
  transportCostMad: number;
  visaCostMad: number;
  servicesCostMad: number;
  totalActualCostMad: number;
  configuredProfitMad: number;
  sellingPriceBeforeDiscountMad: number;
  discountMad: number;
  finalSellingPriceMad: number;
  effectiveProfitMad: number;
  isDeficit: boolean;
}

interface OfferData {
  id: string;
  name: string;
  fixedProfitMad: number;
  isActive: boolean;
  notes?: string | null;
  hotelStays: HotelStay[];
  trip: {
    id: string;
    name: string;
    slug: string;
    startDate: string;
    endDate: string;
    expectedPilgrims: number;
    flightCost: number;
    flightCurrency: string;
    sarToMadRate: number;
    eurToMadRate: number;
    groupBusCostSar: number;
    visaCostSar: number;
  };
  matrix?: Record<"SINGLE" | "DOUBLE" | "TRIPLE" | "QUAD", RoomBreakdownItem>;
  sharedCosts?: {
    flightCostMad: number;
    groupBusCostSar: number;
    groupBusCostMad: number;
    visaCostSar: number;
    visaCostMad: number;
    servicesCostMad: number;
  };
}

export default function OfferPricingWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const offerId = params.offerId as string;
  const tripId = params.id as string;
  const { t, language, dir } = useLanguage();

  const [offer, setOffer] = useState<OfferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingOffer, setSavingOffer] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Offer editable fields
  const [offerName, setOfferName] = useState("");
  const [fixedProfitMad, setFixedProfitMad] = useState<number>(2000);
  const [isActive, setIsActive] = useState(true);

  // Add/Edit Hotel Stay Modal
  const [isStayModalOpen, setIsStayModalOpen] = useState(false);
  const [editingStay, setEditingStay] = useState<HotelStay | null>(null);
  const [staySubmitting, setStaySubmitting] = useState(false);

  const [stayFormData, setStayFormData] = useState<{
    city: City;
    hotelName: string;
    checkInDate: string;
    checkOutDate: string;
    singleDoubleRateSar: number;
    tripleRateSar: number;
    quadRateSar: number;
    manualNightsOverride: string | number;
    notes: string;
  }>({
    city: City.MAKKAH,
    hotelName: "",
    checkInDate: "",
    checkOutDate: "",
    singleDoubleRateSar: 1000,
    tripleRateSar: 1200,
    quadRateSar: 1500,
    manualNightsOverride: "",
    notes: "",
  });

  const fetchOfferDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/offers/${offerId}`);
      const data = await res.json();
      if (res.ok && data.offer) {
        setOffer(data.offer);
        setOfferName(data.offer.name);
        setFixedProfitMad(data.offer.fixedProfitMad);
        setIsActive(data.offer.isActive);
      } else {
        throw new Error(data.error || "Failed to load offer");
      }
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error loading offer",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (offerId) fetchOfferDetails();
  }, [offerId]);

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOffer(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: offerName,
          fixedProfitMad,
          isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setNotification({
        type: "success",
        text: language === "ar" ? "تم حفظ الباقة والربح بنجاح!" : "Offer and profit margin saved successfully!",
      });
      fetchOfferDetails();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving offer",
      });
    } finally {
      setSavingOffer(false);
    }
  };

  const handleOpenAddStay = (defaultCity: City = City.MAKKAH) => {
    setEditingStay(null);
    const tripStart = offer?.trip.startDate ? new Date(offer.trip.startDate).toISOString().split("T")[0] : "";
    const tripEnd = offer?.trip.endDate ? new Date(offer.trip.endDate).toISOString().split("T")[0] : "";

    setStayFormData({
      city: defaultCity,
      hotelName: defaultCity === City.MAKKAH ? "Swissôtel Al Maqam Makkah" : "Madinah Hilton",
      checkInDate: tripStart,
      checkOutDate: tripEnd,
      singleDoubleRateSar: defaultCity === City.MAKKAH ? 1000 : 800,
      tripleRateSar: defaultCity === City.MAKKAH ? 1200 : 950,
      quadRateSar: defaultCity === City.MAKKAH ? 1500 : 1150,
      manualNightsOverride: "",
      notes: "",
    });
    setIsStayModalOpen(true);
  };

  const handleOpenEditStay = (stay: HotelStay) => {
    setEditingStay(stay);
    setStayFormData({
      city: stay.city,
      hotelName: stay.hotelName,
      checkInDate: new Date(stay.checkInDate).toISOString().split("T")[0],
      checkOutDate: new Date(stay.checkOutDate).toISOString().split("T")[0],
      singleDoubleRateSar: stay.singleDoubleRateSar,
      tripleRateSar: stay.tripleRateSar,
      quadRateSar: stay.quadRateSar,
      manualNightsOverride: stay.isNightsOverridden ? stay.nightsCount : "",
      notes: stay.notes || "",
    });
    setIsStayModalOpen(true);
  };

  const handleSaveStay = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaySubmitting(true);
    setNotification(null);

    try {
      const payload = {
        city: stayFormData.city,
        hotelName: stayFormData.hotelName,
        checkInDate: stayFormData.checkInDate,
        checkOutDate: stayFormData.checkOutDate,
        singleDoubleRateSar: Number(stayFormData.singleDoubleRateSar),
        tripleRateSar: Number(stayFormData.tripleRateSar),
        quadRateSar: Number(stayFormData.quadRateSar),
        manualNightsOverride:
          stayFormData.manualNightsOverride !== ""
            ? parseInt(String(stayFormData.manualNightsOverride))
            : null,
        notes: stayFormData.notes || null,
      };

      const url = editingStay
        ? `/api/offers/hotel-stays/${editingStay.id}`
        : `/api/offers/${offerId}/hotel-stays`;
      const method = editingStay ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save stay failed");

      setNotification({
        type: "success",
        text:
          language === "ar"
            ? `تم حفظ الإقامة الفندقية "${stayFormData.hotelName}" وتحديث مصفوفة الأسعار!`
            : `Hotel stay "${stayFormData.hotelName}" saved and pricing matrix updated!`,
      });
      setIsStayModalOpen(false);
      fetchOfferDetails();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving hotel stay",
      });
    } finally {
      setStaySubmitting(false);
    }
  };

  const handleRestoreAutoNights = async (stayId: string) => {
    try {
      const res = await fetch(`/api/offers/hotel-stays/${stayId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restoreAutoCalculation: true }),
      });
      if (res.ok) {
        setNotification({
          type: "success",
          text: language === "ar" ? "تمت استعادة حساب الليالي التلقائي بنجاح!" : "Automatic nights calculation restored!",
        });
        fetchOfferDetails();
      }
    } catch {
      setNotification({ type: "error", text: "Failed to restore automatic nights" });
    }
  };

  const handleDeleteStay = async (stayId: string, name: string) => {
    if (!confirm(language === "ar" ? `هل أنت متأكد من حذف إقامة "${name}"؟` : `Delete stay "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/offers/hotel-stays/${stayId}`, { method: "DELETE" });
      if (res.ok) {
        setNotification({
          type: "success",
          text: language === "ar" ? `تم حذف الإقامة بنجاح.` : `Stay deleted successfully.`,
        });
        fetchOfferDetails();
      }
    } catch {
      setNotification({ type: "error", text: "Delete failed" });
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
        <span>{t("loading")}</span>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-800">Offer not found</h2>
        <Link href={`/trips/${tripId}`} className="mt-4 inline-block text-xs font-semibold text-emerald-700">
          ← {t("back")}
        </Link>
      </div>
    );
  }

  const matrix = offer.matrix;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/trips/${tripId}`}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {offer.trip.name}
              </span>
              <span className="text-slate-300">•</span>
              <h1 className="text-2xl font-bold text-slate-900">{offerName}</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{t("offersSubtitle")}</p>
          </div>
        </div>

        {/* Quick Offer Settings Bar */}
        <form onSubmit={handleSaveOffer} className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">{t("fixedProfitMad")}:</span>
            <input
              type="number"
              step="50"
              min="0"
              value={fixedProfitMad}
              onChange={(e) => setFixedProfitMad(parseFloat(e.target.value) || 0)}
              className="w-24 px-2 py-1 text-xs font-bold text-emerald-800 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <span className="text-xs font-bold text-slate-400">{t("currencyMad")}</span>
          </div>

          <button
            type="submit"
            disabled={savingOffer}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {savingOffer ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{t("save")}</span>
          </button>
        </form>
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

      {/* Mandatory Supplier Pricing Rule Banner */}
      <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex gap-3">
        <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">{t("nightlyRateClarification")}</p>
          <p className="text-amber-800">
            {language === "ar"
              ? "أسعار المورد للفنادق تُدخل للغرفة الكاملة في الليلة الواحدة. الغرفة الفردية والغرفة الثنائية تشتركان في نفس سعر الغرفة الإجمالي لليلة، لكن التكلفة تُقسم على 1 للفردي وعلى 2 للثنائي. تُحسب الليالي تلقائياً ويمكن تعديلها يدوياً مع إمكانية الاستعادة بنقرة واحدة."
              : "Hotel room rates from suppliers are always full-room prices per night. Single and Double rooms share the same full-room rate, divided by 1 for Single and 2 for Double. Nights are calculated automatically and can be manually overridden with one-click restoration."}
          </p>
        </div>
      </div>

      {/* SECTION 1: Hotel Accommodations Editor */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="font-bold text-base text-slate-900">{t("hotelsSection")}</h2>
              <p className="text-xs text-slate-500">
                {language === "ar" ? "مكة المكرمة، المدينة المنورة، وإقامات أخرى مضافة" : "Makkah, Madinah, and additional custom stays"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenAddStay(City.MAKKAH)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "+ فندق مكة" : "+ Makkah Hotel"}</span>
            </button>
            <button
              onClick={() => handleOpenAddStay(City.MADINAH)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "+ فندق المدينة" : "+ Madinah Hotel"}</span>
            </button>
          </div>
        </div>

        {offer.hotelStays.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">{t("noHotelsYet")}</p>
            <p className="text-slate-400 mt-1">
              {language === "ar" ? "أضف فندق مكة وفندق المدينة لبدء حساب مصفوفة تسعير الغرف." : "Add Makkah and Madinah hotels to compute the room pricing matrix."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {offer.hotelStays.map((stay) => {
              const checkIn = new Date(stay.checkInDate);
              const checkOut = new Date(stay.checkOutDate);
              const fullRoomDoubleTotal = stay.singleDoubleRateSar * stay.nightsCount;
              const fullRoomTripleTotal = stay.tripleRateSar * stay.nightsCount;
              const fullRoomQuadTotal = stay.quadRateSar * stay.nightsCount;

              return (
                <div
                  key={stay.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-4"
                >
                  {/* Stay Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          stay.city === City.MAKKAH
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                            : "bg-blue-100 text-blue-900 border-blue-300"
                        }`}
                      >
                        {stay.city === City.MAKKAH
                          ? t("makkah")
                          : stay.city === City.MADINAH
                          ? t("madinah")
                          : stay.city}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900">{stay.hotelName}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {stay.isNightsOverridden && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          {t("isOverriddenBadge")}
                        </span>
                      )}

                      {stay.isNightsOverridden && (
                        <button
                          onClick={() => handleRestoreAutoNights(stay.id)}
                          className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 underline cursor-pointer"
                          title="Restore calculated nights from check-in/out dates"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{t("restoreAutoNights")}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditStay(stay)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                        title={t("edit")}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStay(stay.id, stay.hotelName)}
                        className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                        title={t("delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Dates & Nights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        {t("checkInDate")} ➔ {t("checkOutDate")}
                      </span>
                      <div className="font-bold text-slate-800 mt-1">
                        {checkIn.toLocaleDateString()} ➔ {checkOut.toLocaleDateString()}
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        {t("nightsCount")}
                      </span>
                      <div className="font-extrabold text-base text-emerald-700 mt-0.5">
                        {stay.nightsCount} {t("nights")}
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        {t("fullRoomCost")} (فردي/ثنائي)
                      </span>
                      <div className="font-bold text-slate-900 mt-1">
                        {fullRoomDoubleTotal.toLocaleString()} {t("currencySar")}
                      </div>
                    </div>
                  </div>

                  {/* Rates Breakdown Table for this stay */}
                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                    <table className="w-full text-start text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
                        <tr>
                          <th className="px-3 py-2">فئة الغرفة</th>
                          <th className="px-3 py-2">سعر الغرفة الكاملة لليلة (ر.س)</th>
                          <th className="px-3 py-2">عدد الليالي</th>
                          <th className="px-3 py-2">تكلفة الغرفة الكاملة</th>
                          <th className="px-3 py-2 text-emerald-700">تكلفة المعتمر في الإقامة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        <tr>
                          <td className="px-3 py-2 font-bold text-slate-900">{t("singleRoom")}</td>
                          <td className="px-3 py-2">{stay.singleDoubleRateSar.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2">{stay.nightsCount}</td>
                          <td className="px-3 py-2">{fullRoomDoubleTotal.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2 font-extrabold text-emerald-800">
                            {fullRoomDoubleTotal.toLocaleString()} ر.س (÷ 1)
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-bold text-slate-900">{t("doubleRoom")}</td>
                          <td className="px-3 py-2">{stay.singleDoubleRateSar.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2">{stay.nightsCount}</td>
                          <td className="px-3 py-2">{fullRoomDoubleTotal.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2 font-extrabold text-emerald-800">
                            {(fullRoomDoubleTotal / 2).toLocaleString()} ر.س (÷ 2)
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-bold text-slate-900">{t("tripleRoom")}</td>
                          <td className="px-3 py-2">{stay.tripleRateSar.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2">{stay.nightsCount}</td>
                          <td className="px-3 py-2">{fullRoomTripleTotal.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2 font-extrabold text-emerald-800">
                            {(fullRoomTripleTotal / 3).toLocaleString()} ر.س (÷ 3)
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-bold text-slate-900">{t("quadRoom")}</td>
                          <td className="px-3 py-2">{stay.quadRateSar.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2">{stay.nightsCount}</td>
                          <td className="px-3 py-2">{fullRoomQuadTotal.toLocaleString()} ر.س</td>
                          <td className="px-3 py-2 font-extrabold text-emerald-800">
                            {(fullRoomQuadTotal / 4).toLocaleString()} ر.س (÷ 4)
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Complete Financial Pricing Matrix (STEP 4) */}
      {matrix && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-700" />
              <div>
                <h2 className="font-bold text-base text-slate-900">{t("matrixTitle")}</h2>
                <p className="text-xs text-slate-500">{t("matrixSubtitle")}</p>
              </div>
            </div>

            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              SAR/MAD: {offer.trip.sarToMadRate} | EUR/MAD: {offer.trip.eurToMadRate}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="px-4 py-3 text-start">بند التكلفة / الحساب</th>
                  <th className="px-4 py-3 text-center">{t("singleRoom")}</th>
                  <th className="px-4 py-3 text-center">{t("doubleRoom")}</th>
                  <th className="px-4 py-3 text-center">{t("tripleRoom")}</th>
                  <th className="px-4 py-3 text-center">{t("quadRoom")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {/* Total Accommodation Cost (MAD) */}
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t("totalAccommodation")}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold">
                    {matrix.SINGLE.hotelCostMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3 text-center font-bold">
                    {matrix.DOUBLE.hotelCostMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3 text-center font-bold">
                    {matrix.TRIPLE.hotelCostMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3 text-center font-bold">
                    {matrix.QUAD.hotelCostMad.toLocaleString()} د.م.
                  </td>
                </tr>

                {/* Visa Cost (MAD) */}
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t("visaCostPerPax")}</span>
                  </td>
                  <td className="px-4 py-3 text-center">{matrix.SINGLE.visaCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.DOUBLE.visaCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.TRIPLE.visaCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.QUAD.visaCostMad.toLocaleString()} د.م.</td>
                </tr>

                {/* Flight Cost (MAD) */}
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t("flightCostPerPax")}</span>
                  </td>
                  <td className="px-4 py-3 text-center">{matrix.SINGLE.flightCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.DOUBLE.flightCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.TRIPLE.flightCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.QUAD.flightCostMad.toLocaleString()} د.م.</td>
                </tr>

                {/* Group Bus Allocation (MAD) */}
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t("groupBusCostPerPax")}</span>
                  </td>
                  <td className="px-4 py-3 text-center">{matrix.SINGLE.transportCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.DOUBLE.transportCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.TRIPLE.transportCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.QUAD.transportCostMad.toLocaleString()} د.م.</td>
                </tr>

                {/* TOTAL ACTUAL COST ROW */}
                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-b-2 border-slate-200">
                  <td className="px-4 py-3 text-slate-900 text-sm">
                    {t("totalCostPriceMad")}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-900">
                    {matrix.SINGLE.totalActualCostMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-900">
                    {matrix.DOUBLE.totalActualCostMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-900">
                    {matrix.TRIPLE.totalActualCostMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-900">
                    {matrix.QUAD.totalActualCostMad.toLocaleString()} د.م.
                  </td>
                </tr>

                {/* FIXED PROFIT MARGIN ROW */}
                <tr className="bg-emerald-50/60 text-emerald-950 font-bold">
                  <td className="px-4 py-3">
                    {t("netProfitMarginMad")}
                  </td>
                  <td className="px-4 py-3 text-center text-emerald-700">
                    +{matrix.SINGLE.configuredProfitMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3 text-center text-emerald-700">
                    +{matrix.DOUBLE.configuredProfitMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3 text-center text-emerald-700">
                    +{matrix.TRIPLE.configuredProfitMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3 text-center text-emerald-700">
                    +{matrix.QUAD.configuredProfitMad.toLocaleString()} د.م.
                  </td>
                </tr>

                {/* FINAL SELLING PRICE ROW */}
                <tr className="bg-emerald-700 text-white font-extrabold text-sm shadow-inner">
                  <td className="px-4 py-3.5 text-amber-300">
                    {t("finalSellingPriceMad")}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {matrix.SINGLE.finalSellingPriceMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {matrix.DOUBLE.finalSellingPriceMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {matrix.TRIPLE.finalSellingPriceMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {matrix.QUAD.finalSellingPriceMad.toLocaleString()} د.م.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Hotel Stay Modal */}
      {isStayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-bold text-base text-slate-900">
                {editingStay ? t("edit") : t("addHotelStay")}
              </h2>
              <button
                onClick={() => setIsStayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStay} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("city")} *</label>
                  <select
                    value={stayFormData.city}
                    onChange={(e) => setStayFormData({ ...stayFormData, city: e.target.value as City })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value={City.MAKKAH}>{t("makkah")}</option>
                    <option value={City.MADINAH}>{t("madinah")}</option>
                    <option value={City.JEDDAH}>Jeddah / جدة</option>
                    <option value={City.OTHER}>Other / أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("hotelName")} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fairmont Makkah"
                    value={stayFormData.hotelName}
                    onChange={(e) => setStayFormData({ ...stayFormData, hotelName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("checkInDate")} *</label>
                  <input
                    type="date"
                    required
                    value={stayFormData.checkInDate}
                    onChange={(e) => setStayFormData({ ...stayFormData, checkInDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("checkOutDate")} *</label>
                  <input
                    type="date"
                    required
                    value={stayFormData.checkOutDate}
                    onChange={(e) => setStayFormData({ ...stayFormData, checkOutDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t("manualNightsOverride")} (اختياري / Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="اتركه فارغاً للحساب التلقائي / Leave blank for auto"
                  value={stayFormData.manualNightsOverride}
                  onChange={(e) => setStayFormData({ ...stayFormData, manualNightsOverride: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800 block mb-2">
                  أسعار الغرفة الكاملة لليلة الواحدة (ر.س) *
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      فردي / ثنائي
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={stayFormData.singleDoubleRateSar}
                      onChange={(e) =>
                        setStayFormData({ ...stayFormData, singleDoubleRateSar: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      ثلاثية
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={stayFormData.tripleRateSar}
                      onChange={(e) =>
                        setStayFormData({ ...stayFormData, tripleRateSar: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      رباعية
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={stayFormData.quadRateSar}
                      onChange={(e) =>
                        setStayFormData({ ...stayFormData, quadRateSar: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStayModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={staySubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-2xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {staySubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingStay ? t("save") : t("addHotelStay")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
