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
  Bus,
  Train,
  ShieldCheck,
  Check,
} from "lucide-react";
import { City, VehicleType, TrainTicketClass } from "@prisma/client";
import { useLanguage } from "@/lib/i18n/language-context";
import { VEHICLE_CAPACITIES, validateVehicleCapacity } from "@/core/finance/calculator";

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

interface AdditionalTransport {
  id: string;
  routeName: string;
  vehicleType: VehicleType;
  vehicleCount: number;
  capacityPerVehicle: number;
  allocatedPilgrimsCount: number;
  supplierReferencePrice: number;
  actualPriceSar: number;
  isPriceOverridden: boolean;
  isIncludedInPackage: boolean;
  notes?: string | null;
}

interface TrainExpense {
  id: string;
  departureStation: string;
  arrivalStation: string;
  travelDate?: string | null;
  ticketClass: TrainTicketClass;
  ticketPriceSar: number;
  passengerCount: number;
  isIncluded: boolean;
  notes?: string | null;
}

interface RoomBreakdownItem {
  roomCategory: "SINGLE" | "DOUBLE" | "TRIPLE" | "QUAD";
  occupancy: number;
  hotelCostMad: number;
  flightCostMad: number;
  transportCostMad: number;
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
  isDeficit: boolean;
}

interface CatalogRouteItem {
  id: string;
  routeName: string;
  origin: string | null;
  destination: string | null;
  vehicleType: VehicleType;
  capacity: number;
  baseCostSar: number;
}

interface OfferData {
  id: string;
  name: string;
  fixedProfitMad: number;
  isActive: boolean;
  notes?: string | null;
  hotelStays: HotelStay[];
  additionalTransports: AdditionalTransport[];
  trainExpenses: TrainExpense[];
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
    additionalTransportCostSar: number;
    additionalTransportCostMad: number;
    trainCostSar: number;
    trainCostMad: number;
    visaCostSar: number;
    visaCostMad: number;
    servicesCostMad: number;
  };
  additionalTransportsSummary?: {
    totalCostSar: number;
    totalCostMad: number;
    includedInPackageCostSar: number;
    includedInPackageCostMad: number;
  };
  trainExpensesSummary?: {
    totalCostSar: number;
    totalCostMad: number;
    includedInPackageCostSar: number;
    includedInPackageCostMad: number;
  };
}

const COMMON_TRAIN_STATIONS = [
  "Makkah Al-Mukarramah (Rusaifa)",
  "Madinah Al-Munawwarah",
  "Jeddah (Al-Sulaymaniyah)",
  "King Abdulaziz International Airport (KAIA)",
  "King Abdullah Economic City (KAEC)",
];

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

  // Catalog items for auto-filling transport prices
  const [catalogItems, setCatalogItems] = useState<CatalogRouteItem[]>([]);

  // Offer editable fields
  const [offerName, setOfferName] = useState("");
  const [fixedProfitMad, setFixedProfitMad] = useState<number>(2000);
  const [isActive, setIsActive] = useState(true);

  // --- Hotel Modal State ---
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

  // --- Additional Transport Modal State ---
  const [isTransportModalOpen, setIsTransportModalOpen] = useState(false);
  const [editingTransport, setEditingTransport] = useState<AdditionalTransport | null>(null);
  const [transportSubmitting, setTransportSubmitting] = useState(false);
  const [transportFormData, setTransportFormData] = useState<{
    routeName: string;
    vehicleType: VehicleType;
    vehicleCount: number;
    allocatedPilgrimsCount: number;
    supplierReferencePrice: number;
    actualPriceSar: number;
    isIncludedInPackage: boolean;
    notes: string;
  }>({
    routeName: "",
    vehicleType: VehicleType.GMC,
    vehicleCount: 1,
    allocatedPilgrimsCount: 7,
    supplierReferencePrice: 600,
    actualPriceSar: 600,
    isIncludedInPackage: true,
    notes: "",
  });

  // --- Train Modal State ---
  const [isTrainModalOpen, setIsTrainModalOpen] = useState(false);
  const [editingTrain, setEditingTrain] = useState<TrainExpense | null>(null);
  const [trainSubmitting, setTrainSubmitting] = useState(false);
  const [trainFormData, setTrainFormData] = useState<{
    departureStation: string;
    arrivalStation: string;
    travelDate: string;
    ticketClass: TrainTicketClass;
    ticketPriceSar: number;
    passengerCount: number;
    isIncluded: boolean;
    notes: string;
  }>({
    departureStation: COMMON_TRAIN_STATIONS[0],
    arrivalStation: COMMON_TRAIN_STATIONS[1],
    travelDate: "",
    ticketClass: TrainTicketClass.ECONOMY,
    ticketPriceSar: 250,
    passengerCount: 40,
    isIncluded: true,
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

  const fetchCatalogItems = async () => {
    try {
      const res = await fetch("/api/transport-catalog");
      const data = await res.json();
      if (res.ok && data.items) {
        setCatalogItems(data.items);
      }
    } catch (err) {
      console.error("Failed to load transport catalog items:", err);
    }
  };

  useEffect(() => {
    if (offerId) {
      fetchOfferDetails();
      fetchCatalogItems();
    }
  }, [offerId]);

  // Save offer top-level settings (profit, name, active)
  const handleSaveOfferSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOffer(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: offerName.trim(),
          fixedProfitMad: Number(fixedProfitMad) || 0,
          isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update offer");

      setNotification({
        type: "success",
        text: language === "ar" ? "تم حفظ إعدادات الباقة وإعادة الحساب بنجاح!" : "Offer settings updated and recalculated successfully!",
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

  // --- Hotel Stays Actions ---
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
    try {
      const url = editingStay
        ? `/api/offers/hotel-stays/${editingStay.id}`
        : `/api/offers/${offerId}/hotel-stays`;
      const method = editingStay ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: stayFormData.city,
          hotelName: stayFormData.hotelName.trim(),
          checkInDate: stayFormData.checkInDate,
          checkOutDate: stayFormData.checkOutDate,
          singleDoubleRateSar: Number(stayFormData.singleDoubleRateSar),
          tripleRateSar: Number(stayFormData.tripleRateSar),
          quadRateSar: Number(stayFormData.quadRateSar),
          manualNightsOverride: stayFormData.manualNightsOverride !== "" ? Number(stayFormData.manualNightsOverride) : null,
          notes: stayFormData.notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save hotel stay");

      setIsStayModalOpen(false);
      fetchOfferDetails();
      setNotification({
        type: "success",
        text: language === "ar" ? "تم حفظ بيانات الإقامة الفندقية بنجاح!" : "Hotel stay saved successfully!",
      });
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving stay",
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
      if (!res.ok) throw new Error("Failed to restore automatic nights");
      fetchOfferDetails();
      setNotification({
        type: "success",
        text: language === "ar" ? "تم استعادة الحساب التلقائي لليالي بناءً على تواريخ الدخول والخروج." : "Restored automatic stay nights calculation.",
      });
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error restoring nights",
      });
    }
  };

  const handleDeleteStay = async (stayId: string, hotelName: string) => {
    const confirmMsg =
      language === "ar"
        ? `هل تريد بالتأكيد إزالة فندق "${hotelName}" من هذه الباقة؟`
        : `Are you sure you want to remove "${hotelName}" from this offer?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/offers/hotel-stays/${stayId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete stay failed");
      fetchOfferDetails();
      setNotification({
        type: "success",
        text: language === "ar" ? "تمت إزالة الفندق بنجاح." : "Hotel stay removed.",
      });
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error deleting stay",
      });
    }
  };

  // --- Additional Transportation Actions ---
  const handleOpenAddTransport = () => {
    setEditingTransport(null);
    const pilgrims = offer?.trip.expectedPilgrims || 40;
    setTransportFormData({
      routeName: "Makkah Ziyarat",
      vehicleType: VehicleType.BUS,
      vehicleCount: 1,
      allocatedPilgrimsCount: pilgrims,
      supplierReferencePrice: 650,
      actualPriceSar: 650,
      isIncludedInPackage: true,
      notes: "",
    });
    setIsTransportModalOpen(true);
  };

  const handleOpenEditTransport = (t: AdditionalTransport) => {
    setEditingTransport(t);
    setTransportFormData({
      routeName: t.routeName,
      vehicleType: t.vehicleType,
      vehicleCount: t.vehicleCount,
      allocatedPilgrimsCount: t.allocatedPilgrimsCount,
      supplierReferencePrice: t.supplierReferencePrice,
      actualPriceSar: t.actualPriceSar,
      isIncludedInPackage: t.isIncludedInPackage,
      notes: t.notes || "",
    });
    setIsTransportModalOpen(true);
  };

  const handleSelectCatalogRoute = (routeId: string) => {
    const selected = catalogItems.find((r) => r.id === routeId);
    if (!selected) return;

    setTransportFormData((prev) => {
      const capacity = selected.capacity || VEHICLE_CAPACITIES[selected.vehicleType] || 4;
      return {
        ...prev,
        routeName: selected.routeName,
        vehicleType: selected.vehicleType,
        supplierReferencePrice: selected.baseCostSar,
        actualPriceSar: selected.baseCostSar,
        allocatedPilgrimsCount: capacity * prev.vehicleCount,
      };
    });
  };

  const handleSaveTransport = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransportSubmitting(true);
    try {
      // Validate capacity client-side
      const capacityCheck = validateVehicleCapacity(
        transportFormData.vehicleType,
        transportFormData.allocatedPilgrimsCount,
        transportFormData.vehicleCount
      );

      if (!capacityCheck.isValid) {
        throw new Error(capacityCheck.message || t("capacityExceededError"));
      }

      const url = editingTransport
        ? `/api/offers/transports/${editingTransport.id}`
        : `/api/offers/${offerId}/transports`;
      const method = editingTransport ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeName: transportFormData.routeName.trim(),
          vehicleType: transportFormData.vehicleType,
          vehicleCount: Number(transportFormData.vehicleCount),
          allocatedPilgrimsCount: Number(transportFormData.allocatedPilgrimsCount),
          supplierReferencePrice: Number(transportFormData.supplierReferencePrice),
          actualPriceSar: Number(transportFormData.actualPriceSar),
          isIncludedInPackage: transportFormData.isIncludedInPackage,
          notes: transportFormData.notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save transportation");

      setIsTransportModalOpen(false);
      fetchOfferDetails();
      setNotification({
        type: "success",
        text: language === "ar" ? "تم حفظ وسيلة النقل الإضافية بنجاح!" : "Additional transport saved successfully!",
      });
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving transport",
      });
    } finally {
      setTransportSubmitting(false);
    }
  };

  const handleDeleteTransport = async (transportId: string, routeName: string) => {
    const confirmMsg =
      language === "ar"
        ? `هل تريد بالتأكيد إزالة بند النقل "${routeName}" من هذه الباقة؟`
        : `Are you sure you want to delete transport "${routeName}"?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/offers/transports/${transportId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete transport failed");
      fetchOfferDetails();
      setNotification({
        type: "success",
        text: language === "ar" ? "تمت إزالة وسيلة النقل بنجاح." : "Transport removed successfully.",
      });
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error deleting transport",
      });
    }
  };

  // --- Haramain Train Actions ---
  const handleOpenAddTrain = () => {
    setEditingTrain(null);
    const pilgrims = offer?.trip.expectedPilgrims || 40;
    setTrainFormData({
      departureStation: COMMON_TRAIN_STATIONS[0],
      arrivalStation: COMMON_TRAIN_STATIONS[1],
      travelDate: "",
      ticketClass: TrainTicketClass.ECONOMY,
      ticketPriceSar: 250,
      passengerCount: pilgrims,
      isIncluded: true,
      notes: "",
    });
    setIsTrainModalOpen(true);
  };

  const handleOpenEditTrain = (tr: TrainExpense) => {
    setEditingTrain(tr);
    setTrainFormData({
      departureStation: tr.departureStation,
      arrivalStation: tr.arrivalStation,
      travelDate: tr.travelDate ? new Date(tr.travelDate).toISOString().split("T")[0] : "",
      ticketClass: tr.ticketClass,
      ticketPriceSar: tr.ticketPriceSar,
      passengerCount: tr.passengerCount,
      isIncluded: tr.isIncluded,
      notes: tr.notes || "",
    });
    setIsTrainModalOpen(true);
  };

  const handleSaveTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrainSubmitting(true);
    try {
      const url = editingTrain
        ? `/api/offers/trains/${editingTrain.id}`
        : `/api/offers/${offerId}/trains`;
      const method = editingTrain ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departureStation: trainFormData.departureStation.trim(),
          arrivalStation: trainFormData.arrivalStation.trim(),
          travelDate: trainFormData.travelDate || null,
          ticketClass: trainFormData.ticketClass,
          ticketPriceSar: Number(trainFormData.ticketPriceSar),
          passengerCount: Number(trainFormData.passengerCount),
          isIncluded: trainFormData.isIncluded,
          notes: trainFormData.notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save train expense");

      setIsTrainModalOpen(false);
      fetchOfferDetails();
      setNotification({
        type: "success",
        text: language === "ar" ? "تم حفظ رحلة قطار الحرمين بنجاح!" : "Train journey saved successfully!",
      });
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving train",
      });
    } finally {
      setTrainSubmitting(false);
    }
  };

  const handleDeleteTrain = async (trainId: string) => {
    const confirmMsg =
      language === "ar"
        ? "هل تريد بالتأكيد إزالة رحلة قطار الحرمين هذه من الباقة؟"
        : "Are you sure you want to remove this train journey?";
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/offers/trains/${trainId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete train failed");
      fetchOfferDetails();
      setNotification({
        type: "success",
        text: language === "ar" ? "تمت إزالة رحلة القطار بنجاح." : "Train journey removed successfully.",
      });
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error deleting train",
      });
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
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-800">
          {language === "ar" ? "الباقة غير موجودة" : "Offer not found"}
        </h2>
        <Link href={`/trips/${tripId}`} className="mt-4 inline-block text-xs font-semibold text-emerald-700">
          ← {language === "ar" ? "العودة للرحلة" : "Back to Trip"}
        </Link>
      </div>
    );
  }

  const { matrix, sharedCosts } = offer;
  const standardBusPerPaxSar = offer.trip.expectedPilgrims > 0 ? offer.trip.groupBusCostSar / offer.trip.expectedPilgrims : 0;
  const standardBusPerPaxMad = standardBusPerPaxSar * offer.trip.sarToMadRate;

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
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
              <h1 className="text-2xl font-bold text-slate-900">{offer.name}</h1>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  offer.isActive
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {offer.isActive ? t("activeStatus") : t("inactiveStatus")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <Link href={`/trips/${offer.trip.id}`} className="font-semibold text-emerald-700 hover:underline">
                {offer.trip.name}
              </Link>
              <span className="text-slate-300">•</span>
              <span>{offer.trip.expectedPilgrims} {t("pax")}</span>
              <span className="text-slate-300">•</span>
              <span>SAR/MAD: {offer.trip.sarToMadRate}</span>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOfferDetails}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs"
            title={t("recalculateOffer")}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t("recalculateOffer")}</span>
          </button>

          <Link
            href={`/trips/${tripId}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            <span>{t("back")}</span>
          </Link>
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
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Offer Settings Bar (Profit & Name) */}
      <form
        onSubmit={handleSaveOfferSettings}
        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {t("offerName")}
            </label>
            <input
              type="text"
              required
              value={offerName}
              onChange={(e) => setOfferName(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {t("fixedProfitMad")}
            </label>
            <input
              type="number"
              required
              min="0"
              step="50"
              value={fixedProfitMad}
              onChange={(e) => setFixedProfitMad(parseFloat(e.target.value) || 0)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-slate-700">
              {language === "ar" ? "تفعيل هذه الباقة" : "Offer is Active"}
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={savingOffer}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 self-end md:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{savingOffer ? t("saving") : t("save")}</span>
        </button>
      </form>

      {/* ============================================================== */}
      {/* SECTION 1: Hotel Accommodations (Phase 3 Core)                */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="font-bold text-base text-slate-900">{t("hotelsSection")}</h2>
              <p className="text-xs text-slate-500">
                {language === "ar"
                  ? "تسعير الغرفة الكاملة لليلة الواحدة وحساب عدد الليالي تلقائياً أو يدوياً."
                  : "Nightly full-room supplier rates with automatic or manual nights calculation."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenAddStay(City.MAKKAH)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("makkah")}</span>
            </button>
            <button
              onClick={() => handleOpenAddStay(City.MADINAH)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg border border-blue-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("madinah")}</span>
            </button>
          </div>
        </div>

        {offer.hotelStays.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">{t("noHotelsYet")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offer.hotelStays.map((stay) => {
              const checkIn = new Date(stay.checkInDate);
              const checkOut = new Date(stay.checkOutDate);
              const fullRoomDoubleTotal = stay.singleDoubleRateSar * stay.nightsCount;
              const fullRoomTripleTotal = stay.tripleRateSar * stay.nightsCount;
              const fullRoomQuadTotal = stay.quadRateSar * stay.nightsCount;

              return (
                <div
                  key={stay.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          stay.city === City.MAKKAH
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {stay.city === City.MAKKAH ? t("makkah") : t("madinah")}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900">{stay.hotelName}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {stay.isNightsOverridden && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          {t("isOverriddenBadge")}
                        </span>
                      )}

                      {stay.isNightsOverridden && (
                        <button
                          onClick={() => handleRestoreAutoNights(stay.id)}
                          className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 underline cursor-pointer"
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

                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                    <table className="w-full text-start text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
                        <tr>
                          <th className="px-3 py-2 text-start">فئة الغرفة</th>
                          <th className="px-3 py-2 text-start">سعر الغرفة الكاملة لليلة</th>
                          <th className="px-3 py-2 text-start">عدد الليالي</th>
                          <th className="px-3 py-2 text-start">إجمالي الغرفة</th>
                          <th className="px-3 py-2 text-start text-emerald-700">تكلفة المعتمر الواحد في الإقامة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        <tr>
                          <td className="px-3 py-2 font-bold text-slate-900">{t("singleRoom")}</td>
                          <td className="px-3 py-2">{stay.singleDoubleRateSar.toLocaleString()} {t("currencySar")}</td>
                          <td className="px-3 py-2">{stay.nightsCount}</td>
                          <td className="px-3 py-2">{fullRoomDoubleTotal.toLocaleString()} {t("currencySar")}</td>
                          <td className="px-3 py-2 font-extrabold text-emerald-800">
                            {fullRoomDoubleTotal.toLocaleString()} {t("currencySar")} (÷ 1)
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-bold text-slate-900">{t("doubleRoom")}</td>
                          <td className="px-3 py-2">{stay.singleDoubleRateSar.toLocaleString()} {t("currencySar")}</td>
                          <td className="px-3 py-2">{stay.nightsCount}</td>
                          <td className="px-3 py-2">{fullRoomDoubleTotal.toLocaleString()} {t("currencySar")}</td>
                          <td className="px-3 py-2 font-extrabold text-emerald-800">
                            {(fullRoomDoubleTotal / 2).toLocaleString()} {t("currencySar")} (÷ 2)
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-bold text-slate-900">{t("tripleRoom")}</td>
                          <td className="px-3 py-2">{stay.tripleRateSar.toLocaleString()} {t("currencySar")}</td>
                          <td className="px-3 py-2">{stay.nightsCount}</td>
                          <td className="px-3 py-2">{fullRoomTripleTotal.toLocaleString()} {t("currencySar")}</td>
                          <td className="px-3 py-2 font-extrabold text-emerald-800">
                            {(fullRoomTripleTotal / 3).toLocaleString()} {t("currencySar")} (÷ 3)
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-bold text-slate-900">{t("quadRoom")}</td>
                          <td className="px-3 py-2">{stay.quadRateSar.toLocaleString()} {t("currencySar")}</td>
                          <td className="px-3 py-2">{stay.nightsCount}</td>
                          <td className="px-3 py-2">{fullRoomQuadTotal.toLocaleString()} {t("currencySar")}</td>
                          <td className="px-3 py-2 font-extrabold text-emerald-800">
                            {(fullRoomQuadTotal / 4).toLocaleString()} {t("currencySar")} (÷ 4)
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

      {/* ============================================================== */}
      {/* SECTION 2: Standard Group Transportation (STEP 1)              */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Bus className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="font-bold text-base text-slate-900">{t("standardGroupTransport")}</h2>
              <p className="text-xs text-slate-500">
                {language === "ar"
                  ? "الحافلة الجماعية المعتمدة على مستوى الرحلة ومشمولة مرة واحدة بالضبط في الباقة الأساسية."
                  : "Trip-level standard group bus included exactly once in the baseline package."}
              </p>
            </div>
          </div>

          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
            {language === "ar" ? "بند أساسي محمي من التكرار" : "Standard Package Component"}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase">{t("groupBusCostSar")}</span>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">
              {offer.trip.groupBusCostSar.toLocaleString()} {t("currencySar")}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">إجمالي تكلفة الحافلة للرحلة</p>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase">{t("expectedPilgrims")}</span>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">
              {offer.trip.expectedPilgrims} {t("pax")}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">قاسم توزيع التكلفة</p>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase">{t("busCostPerPilgrim")} (ر.س)</span>
            <div className="text-lg font-extrabold text-amber-800 mt-0.5">
              {standardBusPerPaxSar.toFixed(1)} {t("currencySar")}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">لكل معتمر بالريال</p>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase">{t("busCostPerPilgrim")} (د.م.)</span>
            <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
              {standardBusPerPaxMad.toFixed(1)} {t("currencyMad")}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">محسوب بسعر صرف {offer.trip.sarToMadRate}</p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 3: Additional Transportation (STEP 2)                  */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Bus className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="font-bold text-base text-slate-900">{t("additionalTransport")}</h2>
              <p className="text-xs text-slate-500">
                {language === "ar"
                  ? "إضافة سيارات خاصة (GMC، سيدان، كوستر، إلخ) مع إمكانية تعديل السعر واختيار الشمول في الباقة."
                  : "Optional or package-included vehicles with capacity checks and manual price overrides."}
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAddTransport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t("addAdditionalTransport")}</span>
          </button>
        </div>

        {offer.additionalTransports.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            <Bus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">{t("noAdditionalTransports")}</p>
            <p className="text-slate-400 mt-1">
              {language === "ar"
                ? "يمكنك إضافة سيارات خاصة من دليل الأسعار، مثل زيارات مكة أو المدينة أو جولات الطائف."
                : "You can add private vehicles from the catalog, e.g. Ziyarat or Taif excursions."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {offer.additionalTransports.map((tItem) => {
              const totalCostSar = tItem.actualPriceSar * tItem.vehicleCount;
              const perPilgrimSar = tItem.allocatedPilgrimsCount > 0 ? totalCostSar / tItem.allocatedPilgrimsCount : 0;
              const perPilgrimMad = perPilgrimSar * offer.trip.sarToMadRate;

              return (
                <div
                  key={tItem.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        {tItem.vehicleType} ({tItem.vehicleCount}x)
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{tItem.routeName}</h4>

                      {tItem.isIncludedInPackage ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full">
                          {t("includedInPackage")}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                          {t("optionalService")}
                        </span>
                      )}

                      {tItem.isPriceOverridden && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                          {t("priceOverrideBadge")}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>السعر للمركبة: <strong>{tItem.actualPriceSar} ر.س</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>توزيع على: <strong>{tItem.allocatedPilgrimsCount} معتمر</strong></span>
                      {tItem.notes && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="italic text-slate-400">{tItem.notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 text-xs">
                    <div className="text-end">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">{t("totalCost")}</div>
                      <div className="font-extrabold text-sm text-slate-900">
                        {totalCostSar.toLocaleString()} {t("currencySar")}
                      </div>
                    </div>

                    <div className="text-end">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">{t("costPerPilgrim")}</div>
                      <div className="font-extrabold text-sm text-emerald-700">
                        {perPilgrimMad.toFixed(1)} {t("currencyMad")}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditTransport(tItem)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                        title={t("edit")}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTransport(tItem.id, tItem.routeName)}
                        className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                        title={t("delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* SECTION 4: Haramain High-Speed Train (STEP 3)                  */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Train className="w-5 h-5 text-blue-700" />
            <div>
              <h2 className="font-bold text-base text-slate-900">{t("haramainTrain")}</h2>
              <p className="text-xs text-slate-500">
                {language === "ar"
                  ? "تسعير تذاكر قطار الحرمين السريع (مكة المكرمة ➔ المدينة المنورة / جدة KAIA) بالدرجة الاقتصادية أو الأعمال."
                  : "Manual Haramain High-Speed Train pricing (Economy & Business) with passenger budget calculation."}
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAddTrain}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t("addTrainJourney")}</span>
          </button>
        </div>

        {offer.trainExpenses.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            <Train className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">{t("noTrainJourneys")}</p>
            <p className="text-slate-400 mt-1">
              {language === "ar"
                ? "يمكنك إضافة رحلة قطار الحرمين السريع للربط بين مكة والمدينة أو مطار جدة."
                : "Add a Haramain High-Speed Rail connection between Makkah, Madinah, or KAIA."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {offer.trainExpenses.map((tr) => {
              const totalCostSar = tr.ticketPriceSar * tr.passengerCount;
              const perPilgrimMad = tr.ticketPriceSar * offer.trip.sarToMadRate;

              return (
                <div
                  key={tr.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        {tr.ticketClass === TrainTicketClass.BUSINESS ? t("businessClass") : t("economyClass")}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">
                        {tr.departureStation} ➔ {tr.arrivalStation}
                      </h4>

                      {tr.isIncluded ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full">
                          {t("includedInPackage")}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                          {t("optionalService")}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{t("ticketPrice")}: <strong>{tr.ticketPriceSar} ر.س</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>{t("passengerCount")}: <strong>{tr.passengerCount} معتمر</strong></span>
                      {tr.travelDate && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>{t("travelDate")}: {new Date(tr.travelDate).toLocaleDateString()}</span>
                        </>
                      )}
                      {tr.notes && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="italic text-slate-400">{tr.notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 text-xs">
                    <div className="text-end">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">{t("totalCost")}</div>
                      <div className="font-extrabold text-sm text-slate-900">
                        {totalCostSar.toLocaleString()} {t("currencySar")}
                      </div>
                    </div>

                    <div className="text-end">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">{t("costPerPilgrim")}</div>
                      <div className="font-extrabold text-sm text-blue-700">
                        {perPilgrimMad.toFixed(1)} {t("currencyMad")}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditTrain(tr)}
                        className="p-1.5 text-slate-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                        title={t("edit")}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTrain(tr.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                        title={t("delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* SECTION 5: Comprehensive Financial Pricing Matrix (STEP 4)     */}
      {/* ============================================================== */}
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
              SAR/MAD: {offer.trip.sarToMadRate} | EUR/MAD: {offer.trip.eurToMadRate} | Visa: {offer.trip.visaCostSar} SAR
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
                {/* 1. Total Accommodation Cost (MAD) */}
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

                {/* 2. Flight Ticket (MAD) */}
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

                {/* 3. Standard Group Bus (MAD) */}
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                    <Bus className="w-3.5 h-3.5 text-amber-600" />
                    <span>{t("groupBusCostPerPax")} ({standardBusPerPaxSar.toFixed(1)} ر.س)</span>
                  </td>
                  <td className="px-4 py-3 text-center">{matrix.SINGLE.groupBusCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.DOUBLE.groupBusCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.TRIPLE.groupBusCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.QUAD.groupBusCostMad.toLocaleString()} د.م.</td>
                </tr>

                {/* 4. Additional Transportation Included (MAD) */}
                {matrix.DOUBLE.additionalTransportCostMad > 0 && (
                  <tr className="hover:bg-slate-50/50 bg-emerald-50/30">
                    <td className="px-4 py-3 font-semibold text-emerald-900 flex items-center gap-1.5">
                      <Bus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t("additionalTransportPerPax")}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-emerald-800 font-semibold">{matrix.SINGLE.additionalTransportCostMad.toLocaleString()} د.م.</td>
                    <td className="px-4 py-3 text-center text-emerald-800 font-semibold">{matrix.DOUBLE.additionalTransportCostMad.toLocaleString()} د.م.</td>
                    <td className="px-4 py-3 text-center text-emerald-800 font-semibold">{matrix.TRIPLE.additionalTransportCostMad.toLocaleString()} د.م.</td>
                    <td className="px-4 py-3 text-center text-emerald-800 font-semibold">{matrix.QUAD.additionalTransportCostMad.toLocaleString()} د.م.</td>
                  </tr>
                )}

                {/* 5. Haramain Train Included (MAD) */}
                {matrix.DOUBLE.trainCostMad > 0 && (
                  <tr className="hover:bg-slate-50/50 bg-blue-50/30">
                    <td className="px-4 py-3 font-semibold text-blue-900 flex items-center gap-1.5">
                      <Train className="w-3.5 h-3.5 text-blue-600" />
                      <span>{t("trainExpensesPerPax")}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-blue-800 font-semibold">{matrix.SINGLE.trainCostMad.toLocaleString()} د.م.</td>
                    <td className="px-4 py-3 text-center text-blue-800 font-semibold">{matrix.DOUBLE.trainCostMad.toLocaleString()} د.م.</td>
                    <td className="px-4 py-3 text-center text-blue-800 font-semibold">{matrix.TRIPLE.trainCostMad.toLocaleString()} د.م.</td>
                    <td className="px-4 py-3 text-center text-blue-800 font-semibold">{matrix.QUAD.trainCostMad.toLocaleString()} د.م.</td>
                  </tr>
                )}

                {/* 6. Visa Fee (MAD) */}
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t("visaCostPerPax")} ({offer.trip.visaCostSar} ر.س)</span>
                  </td>
                  <td className="px-4 py-3 text-center">{matrix.SINGLE.visaCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.DOUBLE.visaCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.TRIPLE.visaCostMad.toLocaleString()} د.م.</td>
                  <td className="px-4 py-3 text-center">{matrix.QUAD.visaCostMad.toLocaleString()} د.م.</td>
                </tr>

                {/* Total Actual Cost (MAD) */}
                <tr className="bg-slate-100/70 font-bold border-t-2 border-slate-200">
                  <td className="px-4 py-3 text-slate-900">{t("totalCostPriceMad")}</td>
                  <td className="px-4 py-3 text-center text-slate-900 font-extrabold">
                    {matrix.SINGLE.totalActualCostMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3 text-center text-slate-900 font-extrabold">
                    {matrix.DOUBLE.totalActualCostMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3 text-center text-slate-900 font-extrabold">
                    {matrix.TRIPLE.totalActualCostMad.toLocaleString()} د.م.
                  </td>
                  <td className="px-4 py-3 text-center text-slate-900 font-extrabold">
                    {matrix.QUAD.totalActualCostMad.toLocaleString()} د.م.
                  </td>
                </tr>

                {/* Configured Profit Margin (MAD) */}
                <tr className="bg-emerald-50/50 font-bold">
                  <td className="px-4 py-3 text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{t("netProfitMarginMad")}</span>
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

                {/* Final Selling Price (MAD) */}
                <tr className="bg-emerald-800 text-white font-extrabold text-sm border-t-2 border-emerald-900">
                  <td className="px-4 py-3.5 tracking-wide">{t("finalSellingPriceMad")}</td>
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

      {/* ============================================================== */}
      {/* MODAL 1: Add/Edit Hotel Stay                                    */}
      {/* ============================================================== */}
      {isStayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">
                  {editingStay ? t("edit") : t("addHotelStay")}
                </h3>
              </div>
              <button
                onClick={() => setIsStayModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStay} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("city")} *</label>
                  <select
                    value={stayFormData.city}
                    onChange={(e) => setStayFormData({ ...stayFormData, city: e.target.value as City })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 bg-white"
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
                    value={stayFormData.hotelName}
                    onChange={(e) => setStayFormData({ ...stayFormData, hotelName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
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
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("checkOutDate")} *</label>
                  <input
                    type="date"
                    required
                    value={stayFormData.checkOutDate}
                    onChange={(e) => setStayFormData({ ...stayFormData, checkOutDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t("manualNightsOverride")} (اتركه فارغاً للحساب التلقائي)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="حساب تلقائي من تواريخ الدخول والخروج"
                  value={stayFormData.manualNightsOverride}
                  onChange={(e) => setStayFormData({ ...stayFormData, manualNightsOverride: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">غرفة كاملة (فردي/ثنائي)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="10"
                    value={stayFormData.singleDoubleRateSar}
                    onChange={(e) => setStayFormData({ ...stayFormData, singleDoubleRateSar: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">غرفة ثلاثية كاملة</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="10"
                    value={stayFormData.tripleRateSar}
                    onChange={(e) => setStayFormData({ ...stayFormData, tripleRateSar: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">غرفة رباعية كاملة</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="10"
                    value={stayFormData.quadRateSar}
                    onChange={(e) => setStayFormData({ ...stayFormData, quadRateSar: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ملاحظات الإقامة</label>
                <input
                  type="text"
                  value={stayFormData.notes}
                  onChange={(e) => setStayFormData({ ...stayFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStayModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={staySubmitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {staySubmitting ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: Add/Edit Additional Transport                          */}
      {/* ============================================================== */}
      {isTransportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bus className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">
                  {editingTransport ? t("editAdditionalTransport") : t("addAdditionalTransport")}
                </h3>
              </div>
              <button
                onClick={() => setIsTransportModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransport} className="p-6 space-y-4 text-xs">
              {/* Quick Select from Catalog */}
              {catalogItems.length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t("selectCatalogRoute")}
                  </label>
                  <select
                    onChange={(e) => handleSelectCatalogRoute(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value="">-- اختار مساراً لتعبئة الأسعار تلقائياً --</option>
                    {catalogItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.routeName} ({item.vehicleType}) — {item.baseCostSar} ر.س
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("routeName")} *</label>
                <input
                  type="text"
                  required
                  value={transportFormData.routeName}
                  onChange={(e) => setTransportFormData({ ...transportFormData, routeName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("vehicleType")} *</label>
                  <select
                    value={transportFormData.vehicleType}
                    onChange={(e) => {
                      const vType = e.target.value as VehicleType;
                      setTransportFormData({
                        ...transportFormData,
                        vehicleType: vType,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value={VehicleType.SEDAN}>Sedan (4 ركاب)</option>
                    <option value={VehicleType.GMC}>GMC (7 ركاب)</option>
                    <option value={VehicleType.STARIA}>Hyundai Staria (7 ركاب)</option>
                    <option value={VehicleType.HIACE}>Toyota Hiace (10 ركاب)</option>
                    <option value={VehicleType.COASTER}>Toyota Coaster (21 راكب)</option>
                    <option value={VehicleType.BUS}>Bus (47 راكب)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("vehicleCount")} *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={transportFormData.vehicleCount}
                    onChange={(e) => setTransportFormData({ ...transportFormData, vehicleCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("allocatedPilgrims")} *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={transportFormData.allocatedPilgrimsCount}
                    onChange={(e) => setTransportFormData({ ...transportFormData, allocatedPilgrimsCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    السعة القصوى: {(VEHICLE_CAPACITIES[transportFormData.vehicleType] || 4) * transportFormData.vehicleCount} راكب
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("actualPriceSar")} *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="10"
                    value={transportFormData.actualPriceSar}
                    onChange={(e) => setTransportFormData({ ...transportFormData, actualPriceSar: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    المرجعي: {transportFormData.supplierReferencePrice} ر.س
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="isIncludedInPackage"
                  checked={transportFormData.isIncludedInPackage}
                  onChange={(e) => setTransportFormData({ ...transportFormData, isIncludedInPackage: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="isIncludedInPackage" className="text-xs font-semibold text-slate-800">
                  {t("includedInPackage")} (يُضاف لتكلفة الباقة الأساسية)
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ملاحظات النقل</label>
                <input
                  type="text"
                  value={transportFormData.notes}
                  onChange={(e) => setTransportFormData({ ...transportFormData, notes: e.target.value })}
                  placeholder="ملاحظات حول وقت الانطلاق، الزيارات، إلخ..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={transportSubmitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {transportSubmitting ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: Add/Edit Haramain Train Expense                        */}
      {/* ============================================================== */}
      {isTrainModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Train className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">
                  {editingTrain ? t("editTrainJourney") : t("addTrainJourney")}
                </h3>
              </div>
              <button
                onClick={() => setIsTrainModalOpen(false)}
                className="text-blue-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTrain} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("departureStation")} *</label>
                  <input
                    type="text"
                    required
                    list="stationsList"
                    value={trainFormData.departureStation}
                    onChange={(e) => setTrainFormData({ ...trainFormData, departureStation: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("arrivalStation")} *</label>
                  <input
                    type="text"
                    required
                    list="stationsList"
                    value={trainFormData.arrivalStation}
                    onChange={(e) => setTrainFormData({ ...trainFormData, arrivalStation: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <datalist id="stationsList">
                  {COMMON_TRAIN_STATIONS.map((st) => (
                    <option key={st} value={st} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("ticketClass")} *</label>
                  <select
                    value={trainFormData.ticketClass}
                    onChange={(e) => setTrainFormData({ ...trainFormData, ticketClass: e.target.value as TrainTicketClass })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value={TrainTicketClass.ECONOMY}>{t("economyClass")}</option>
                    <option value={TrainTicketClass.BUSINESS}>{t("businessClass")}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("travelDate")}</label>
                  <input
                    type="date"
                    value={trainFormData.travelDate}
                    onChange={(e) => setTrainFormData({ ...trainFormData, travelDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("ticketPriceSar")} *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="5"
                    value={trainFormData.ticketPriceSar}
                    onChange={(e) => setTrainFormData({ ...trainFormData, ticketPriceSar: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("passengerCount")} *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={trainFormData.passengerCount}
                    onChange={(e) => setTrainFormData({ ...trainFormData, passengerCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-900">{t("totalCost")}:</span>
                <span className="font-extrabold text-blue-800 text-sm">
                  {(trainFormData.ticketPriceSar * trainFormData.passengerCount).toLocaleString()} {t("currencySar")}
                </span>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="isIncludedTrain"
                  checked={trainFormData.isIncluded}
                  onChange={(e) => setTrainFormData({ ...trainFormData, isIncluded: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="isIncludedTrain" className="text-xs font-semibold text-slate-800">
                  {t("includedInPackage")} (يُضاف لسعر الباقة الأساسية لكل معتمر)
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ملاحظات الرحلة</label>
                <input
                  type="text"
                  value={trainFormData.notes}
                  onChange={(e) => setTrainFormData({ ...trainFormData, notes: e.target.value })}
                  placeholder="رقم الرحلة، موعد الانطلاق، إلخ..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTrainModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={trainSubmitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {trainSubmitting ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
