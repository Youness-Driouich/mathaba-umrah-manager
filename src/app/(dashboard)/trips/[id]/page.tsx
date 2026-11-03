"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  Calendar,
  Users,
  Plane,
  Bus,
  Globe,
  Copy,
  Archive,
  Edit,
  Trash2,
  Layers,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";
import { TripStatus } from "@prisma/client";
import { useLanguage } from "@/lib/i18n/language-context";

interface OfferWithMatrix {
  id: string;
  name: string;
  fixedProfitMad: number;
  isActive: boolean;
  notes?: string | null;
  hotelStaysCount: number;
  quotesCount: number;
  matrix?: {
    SINGLE: { finalSellingPriceMad: number; isDeficit: boolean };
    DOUBLE: { finalSellingPriceMad: number; isDeficit: boolean };
    TRIPLE: { finalSellingPriceMad: number; isDeficit: boolean };
    QUAD: { finalSellingPriceMad: number; isDeficit: boolean };
  };
}

interface TripDetails {
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
  visaCostSar: number;
  status: TripStatus;
  notes?: string | null;
  offers: OfferWithMatrix[];
}

export default function TripWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const { t, language } = useLanguage();

  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Offer Modal
  const [isNewOfferModalOpen, setIsNewOfferModalOpen] = useState(false);
  const [newOfferName, setNewOfferName] = useState("");
  const [newOfferProfit, setNewOfferProfit] = useState<number>(2000);
  const [newOfferNotes, setNewOfferNotes] = useState("");
  const [creatingOffer, setCreatingOffer] = useState(false);

  const fetchTrip = async () => {
    try {
      setLoading(true);
      // Fetch trip details
      const tripRes = await fetch(`/api/trips/${tripId}`);
      const tripData = await tripRes.json();

      if (!tripRes.ok || !tripData.trip) {
        throw new Error(tripData.error || "Failed to load trip");
      }

      // Also fetch calculated offers with room breakdowns
      const offersRes = await fetch(`/api/trips/${tripId}/offers`);
      const offersData = await offersRes.json();

      const combinedTrip: TripDetails = {
        ...tripData.trip,
        offers: offersRes.ok && offersData.offers ? offersData.offers : tripData.trip.offers,
      };

      setTrip(combinedTrip);
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error fetching trip",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) fetchTrip();
  }, [tripId]);

  const handleDuplicate = async () => {
    if (!trip) return;
    setActionLoading(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/trips/${trip.id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Duplication failed");

      setNotification({
        type: "success",
        text: t("duplicateTripNotice"),
      });
      setTimeout(() => {
        router.push(`/trips/${data.trip.id}`);
      }, 1000);
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error duplicating trip.",
      });
      setActionLoading(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!trip) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/archive`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Archive update failed");

      setNotification({
        type: "success",
        text: `${language === "ar" ? "تم تحديث حالة الرحلة إلى" : "Trip status updated to"} ${data.status}.`,
      });
      fetchTrip();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error updating archive status.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!trip) return;
    const confirmMsg =
      language === "ar"
        ? `هل أنت متأكد من حذف رحلة "${trip.name}" نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.`
        : `Are you sure you want to permanently delete "${trip.name}"? This cannot be undone.`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/trips");
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error deleting trip.",
      });
      setActionLoading(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferName.trim()) return;
    setCreatingOffer(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOfferName.trim(),
          fixedProfitMad: Number(newOfferProfit) || 0,
          notes: newOfferNotes.trim() || null,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create offer");

      setIsNewOfferModalOpen(false);
      setNewOfferName("");
      setNewOfferProfit(2000);
      setNewOfferNotes("");
      setNotification({
        type: "success",
        text: language === "ar" ? `تم إنشاء الباقة بنجاح!` : `Offer created successfully!`,
      });

      // Redirect immediately to the newly created offer's workspace
      router.push(`/trips/${tripId}/offers/${data.offer.id}`);
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error creating offer.",
      });
    } finally {
      setCreatingOffer(false);
    }
  };

  const handleDuplicateOffer = async (offerId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/offers/${offerId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to duplicate offer");

      setNotification({
        type: "success",
        text: language === "ar" ? "تم نسخ الباقة مع كافة الفنادق بنجاح!" : "Offer duplicated successfully!",
      });
      fetchTrip();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error duplicating offer.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOffer = async (offerId: string, offerName: string) => {
    const confirmMsg =
      language === "ar"
        ? `هل أنت متأكد من حذف باقة "${offerName}" وكافة فنادقها؟`
        : `Are you sure you want to delete package "${offerName}" and all its hotels?`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/offers/${offerId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setNotification({
        type: "success",
        text: language === "ar" ? "تم حذف الباقة بنجاح." : "Offer deleted successfully.",
      });
      fetchTrip();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error deleting offer.",
      });
    } finally {
      setActionLoading(false);
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

  if (!trip) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-800">
          {language === "ar" ? "الرحلة غير موجودة" : "Trip not found"}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {language === "ar" ? "قد تكون هذه الرحلة قد حُذفت أو أن المعرف غير صحيح." : "This trip may have been removed or does not exist."}
        </p>
        <Link href="/trips" className="mt-4 inline-block text-xs font-semibold text-emerald-700">
          ← {language === "ar" ? "العودة لدليل الرحلات" : "Back to Trips"}
        </Link>
      </div>
    );
  }

  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const daysDiff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const busCostPerPilgrimSar = trip.expectedPilgrims > 0 ? trip.groupBusCostSar / trip.expectedPilgrims : 0;
  const busCostPerPilgrimMad = busCostPerPilgrimSar * trip.sarToMadRate;

  return (
    <div className="space-y-6">
      {/* Back button & Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/trips"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{trip.name}</h1>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  trip.status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : trip.status === "FINALIZED"
                    ? "bg-blue-100 text-blue-800 border-blue-300"
                    : trip.status === "ARCHIVED"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {trip.status === "ACTIVE"
                  ? t("activeStatus")
                  : trip.status === "FINALIZED"
                  ? t("finalizedStatus")
                  : trip.status === "ARCHIVED"
                  ? t("archivedStatus")
                  : t("draftStatus")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {start.toLocaleDateString()} ➔ {end.toLocaleDateString()} ({daysDiff} {t("days")})
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-[11px] text-slate-400">slug: {trip.slug}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDuplicate}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs"
            title={language === "ar" ? "نسخ الرحلة مع حماية الأسعار التاريخية" : "Duplicate Trip (Preserves historical isolation)"}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t("duplicate")}</span>
          </button>

          <button
            onClick={handleToggleArchive}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{trip.status === "ARCHIVED" ? t("unarchive") : t("archive")}</span>
          </button>

          <Link
            href={`/trips/${trip.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>{t("edit")}</span>
          </Link>

          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="p-2 border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
            title={t("delete")}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pilgrims Capacity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" /> {t("expectedPilgrims")}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {trip.expectedPilgrims}{" "}
            <span className="text-xs font-normal text-slate-500">{t("pax")}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {language === "ar" ? "قاسم التكاليف المشتركة" : "Shared trip capacity divider"}
          </p>
        </div>

        {/* Flight Ticket Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span className="flex items-center gap-1.5">
              <Plane className="w-4 h-4 text-blue-600" /> {t("flightCost")}
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
              {trip.flightAllocationType === "PER_PERSON" ? t("allocationPerPerson") : t("allocationGroupTotal")}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {trip.flightCost.toLocaleString()}{" "}
            <span className="text-xs font-normal text-slate-500">{trip.flightCurrency}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {trip.airlineName || (language === "ar" ? "طيران معتمد" : "Standard Airline")}
          </p>
        </div>

        {/* Group Bus Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span className="flex items-center gap-1.5">
              <Bus className="w-4 h-4 text-amber-600" /> {t("groupBusCostSar")}
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
              {trip.groupBusCount} {language === "ar" ? "حافلات" : "Bus(es)"}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {busCostPerPilgrimSar.toFixed(1)}{" "}
            <span className="text-xs font-normal text-slate-500">{t("currencySar")} /{t("pax")}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            ≈ {busCostPerPilgrimMad.toFixed(1)} {t("currencyMad")} {t("busCostPerPilgrim")}
          </p>
        </div>

        {/* Exchange Rates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-600" /> {t("tripRatesSection")}
            </span>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="text-sm font-bold text-slate-900">
              SAR/MAD: <span className="text-emerald-700">{trip.sarToMadRate}</span>
            </div>
            <div className="text-sm font-bold text-slate-900">
              EUR/MAD: <span className="text-emerald-700">{trip.eurToMadRate}</span>
            </div>
            <div className="text-xs font-semibold text-slate-700 pt-0.5">
              {t("visaCostPerPax")}: <span className="text-amber-700 font-bold">{trip.visaCostSar || 525} {t("currencySar")}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {language === "ar" ? "نسخة تاريخية محصنة" : "Immutable trip snapshot"}
          </p>
        </div>
      </div>

      {/* Internal Notes Section if present */}
      {trip.notes && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> {t("tripNotes")}
          </h3>
          <p className="text-xs text-slate-700 whitespace-pre-wrap">{trip.notes}</p>
        </div>
      )}

      {/* Offers & Packages Workspace (Phase 3 Core) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">{t("offersTitle")}</h2>
              <p className="text-xs text-slate-500">{t("offersSubtitle")}</p>
            </div>
          </div>

          <button
            onClick={() => setIsNewOfferModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t("createOffer")}</span>
          </button>
        </div>

        {trip.offers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">{t("noOffersYet")}</p>
            <p className="text-slate-400 mt-1 max-w-md mx-auto">
              {language === "ar"
                ? "أنشئ باقات متعددة مثل (اقتصادية، سياحية، 5 نجوم) وحدد هوامش الربح الصافية بالدرهم المغربي لكل معتمر."
                : "Create multiple packages such as Economy, Tourist, and 5-Star VIP with dedicated fixed profit margins in MAD."}
            </p>
            <button
              onClick={() => setIsNewOfferModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t("createOffer")}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trip.offers.map((offer) => (
              <div
                key={offer.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Offer Header & Status */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base text-slate-900">{offer.name}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        offer.isActive
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {offer.isActive ? t("activeStatus") : t("inactiveStatus")}
                    </span>
                  </div>

                  {/* Fixed Profit Callout */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-emerald-900 font-semibold">{t("fixedProfitMad")}:</span>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      +{offer.fixedProfitMad.toLocaleString()} {t("currencyMad")}
                    </span>
                  </div>

                  {/* Hotel Count & Quotes Count */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {offer.hotelStaysCount} {language === "ar" ? "فنادق مضافة" : "hotel stays"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {offer.quotesCount} {language === "ar" ? "عروض معتمرين" : "quotes"}
                    </span>
                  </div>

                  {/* 4-Room Price Matrix Quick Grid */}
                  {offer.matrix && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        {language === "ar" ? "أسعار البيع النهائية للمعتمر (د.م.):" : "Final Selling Prices (MAD):"}
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center">
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                          <div className="text-[9px] text-slate-400 font-bold uppercase">{t("quadRoom").split(" ")[0]}</div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5">
                            {offer.matrix.QUAD.finalSellingPriceMad.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                          <div className="text-[9px] text-slate-400 font-bold uppercase">{t("tripleRoom").split(" ")[0]}</div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5">
                            {offer.matrix.TRIPLE.finalSellingPriceMad.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                          <div className="text-[9px] text-slate-400 font-bold uppercase">{t("doubleRoom").split(" ")[0]}</div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5">
                            {offer.matrix.DOUBLE.finalSellingPriceMad.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                          <div className="text-[9px] text-slate-400 font-bold uppercase">{t("singleRoom").split(" ")[0]}</div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5">
                            {offer.matrix.SINGLE.finalSellingPriceMad.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Offer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicateOffer(offer.id)}
                      disabled={actionLoading}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title={language === "ar" ? "تكرار الباقة" : "Duplicate package"}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteOffer(offer.id, offer.name)}
                      disabled={actionLoading}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title={language === "ar" ? "حذف الباقة" : "Delete package"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Link
                    href={`/trips/${trip.id}/offers/${offer.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-all shadow-2xs"
                  >
                    <span>{language === "ar" ? "فتح وإدارة الفنادق" : "Manage Hotels & Rates"}</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create New Offer Modal */}
      {isNewOfferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">{t("createOffer")}</h3>
              </div>
              <button
                onClick={() => setIsNewOfferModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("offerName")} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    language === "ar"
                      ? "مثال: الباقة الاقتصادية (فنادق 3 نجوم)"
                      : "e.g., Economy Package (3-Star)"
                  }
                  value={newOfferName}
                  onChange={(e) => setNewOfferName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("fixedProfitMad")} *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="50"
                  value={newOfferProfit}
                  onChange={(e) => setNewOfferProfit(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">{t("fixedProfitHelp")}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === "ar" ? "ملاحظات إضافية (اختياري)" : "Notes (Optional)"}
                </label>
                <textarea
                  rows={2}
                  value={newOfferNotes}
                  onChange={(e) => setNewOfferNotes(e.target.value)}
                  placeholder={
                    language === "ar"
                      ? "ملاحظات حول الوجبات، القرب من الحرم، إلخ..."
                      : "Notes regarding meal plans, shuttle service, distance..."
                  }
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewOfferModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={creatingOffer}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {creatingOffer ? t("saving") : t("createOffer")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
