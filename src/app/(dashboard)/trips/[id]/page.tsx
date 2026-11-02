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
} from "lucide-react";
import { TripStatus } from "@prisma/client";

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
  status: TripStatus;
  notes?: string | null;
  offers: Array<{
    id: string;
    name: string;
    fixedProfitMad: number;
    isActive: boolean;
    hotelStaysCount: number;
    quotesCount: number;
  }>;
}

const STATUS_BADGES: Record<TripStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-700 border-slate-200" },
  ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  FINALIZED: { label: "Finalized", className: "bg-blue-100 text-blue-800 border-blue-300" },
  ARCHIVED: { label: "Archived", className: "bg-amber-100 text-amber-800 border-amber-300" },
};

export default function TripWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchTrip = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trips/${tripId}`);
      const data = await res.json();
      if (res.ok && data.trip) {
        setTrip(data.trip);
      } else {
        throw new Error(data.error || "Failed to load trip");
      }
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
        text: `Trip duplicated! Redirecting to the cloned workspace...`,
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
        text: `Trip status updated to ${data.status}.`,
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
    if (!confirm(`Are you sure you want to permanently delete "${trip.name}"? This cannot be undone.`)) {
      return;
    }
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

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
        <span>Loading trip workspace from Neon PostgreSQL...</span>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-800">Trip not found</h2>
        <p className="text-xs text-slate-400 mt-1">This trip may have been removed or does not exist.</p>
        <Link href="/trips" className="mt-4 inline-block text-xs font-semibold text-emerald-700">
          ← Back to Trips Directory
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
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{trip.name}</h1>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  STATUS_BADGES[trip.status].className
                }`}
              >
                {STATUS_BADGES[trip.status].label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {start.toLocaleDateString()} ➔ {end.toLocaleDateString()} ({daysDiff} days)
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
            title="Duplicate Trip (Preserves historical isolation)"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={handleToggleArchive}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{trip.status === "ARCHIVED" ? "Unarchive" : "Archive"}</span>
          </button>

          <Link
            href={`/trips/${trip.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Trip</span>
          </Link>

          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="p-2 border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
            title="Delete Trip"
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
              <Users className="w-4 h-4 text-emerald-600" /> Planned Pilgrims
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {trip.expectedPilgrims}{" "}
            <span className="text-xs font-normal text-slate-500">pilgrims</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Shared trip capacity divider</p>
        </div>

        {/* Flight Ticket Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span className="flex items-center gap-1.5">
              <Plane className="w-4 h-4 text-blue-600" /> Flight Cost
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
              {trip.flightAllocationType === "PER_PERSON" ? "Per Pax" : "Group Total"}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {trip.flightCost.toLocaleString()}{" "}
            <span className="text-xs font-normal text-slate-500">{trip.flightCurrency}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {trip.airlineName || "Standard Airline"}
          </p>
        </div>

        {/* Group Bus Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span className="flex items-center gap-1.5">
              <Bus className="w-4 h-4 text-amber-600" /> Group Bus Cost
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
              {trip.groupBusCount} Bus(es)
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {busCostPerPilgrimSar.toFixed(1)}{" "}
            <span className="text-xs font-normal text-slate-500">SAR /pax</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            ≈ {busCostPerPilgrimMad.toFixed(1)} MAD per pilgrim
          </p>
        </div>

        {/* Exchange Rates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-600" /> Trip Exchange Rates
            </span>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="text-sm font-bold text-slate-900">
              SAR/MAD: <span className="text-emerald-700">{trip.sarToMadRate}</span>
            </div>
            <div className="text-sm font-bold text-slate-900">
              EUR/MAD: <span className="text-emerald-700">{trip.eurToMadRate}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Immutable trip snapshot</p>
        </div>
      </div>

      {/* Internal Notes Section if present */}
      {trip.notes && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> Internal Notes
          </h3>
          <p className="text-xs text-slate-700 whitespace-pre-wrap">{trip.notes}</p>
        </div>
      )}

      {/* Offers & Packages Workspace (Phase 3 Foundation) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="font-bold text-sm text-slate-900">Trip Packages & Offers</h2>
              <p className="text-[11px] text-slate-500">
                Economy, Tourist, and Premium packages with hotel matrices and profit margins.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full">
            Ready for Phase 3
          </span>
        </div>

        {trip.offers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No offers attached to this trip yet.</p>
            <p className="text-slate-400 mt-1">
              The <strong>Hotel Offer Builder & Cost Calculator</strong> will be implemented in Phase 3.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {trip.offers.map((offer) => (
              <div key={offer.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <h4 className="font-bold text-sm text-slate-900">{offer.name}</h4>
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  Profit: +{offer.fixedProfitMad.toLocaleString()} MAD /pax
                </p>
                <div className="text-[11px] text-slate-500 mt-2">
                  {offer.hotelStaysCount} Hotel stays • {offer.quotesCount} Quotes
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
