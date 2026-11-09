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
      setNotification({ type: "error", text: "Failed to load trips from Neon." });
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
      if (!res.ok) throw new Error(data.error || "Duplication failed");

      setNotification({
        type: "success",
        text: `Trip "${name}" duplicated successfully. Historical isolation preserved!`,
      });
      fetchTrips();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error duplicating trip.",
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
      if (!res.ok) throw new Error(data.error || "Archive action failed");

      setNotification({
        type: "success",
        text: `Trip "${name}" archive status updated to ${data.status}.`,
      });
      fetchTrips();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Error archiving trip.",
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

  // Calculate statistics
  const totalPilgrims = trips.reduce((acc, t) => acc + (t.status !== "ARCHIVED" ? t.expectedPilgrims : 0), 0);
  const activeCount = trips.filter((t) => t.status === "ACTIVE").length;
  const draftCount = trips.filter((t) => t.status === "DRAFT").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-emerald-700" />
            <span>Umrah Trips Hub</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage trips, group bus allocations, flight costs, and exchange rate snapshots.
          </p>
        </div>

        <Link
          href="/trips/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Trip</span>
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

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Trips</span>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">{trips.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase">Active Trips</span>
          <div className="text-xl font-extrabold text-emerald-700 mt-0.5">{activeCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Draft Trips</span>
          <div className="text-xl font-extrabold text-slate-700 mt-0.5">{draftCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-600 uppercase">Planned Pilgrims</span>
          <div className="text-xl font-extrabold text-blue-700 mt-0.5">{totalPilgrims}</div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trip name, airline, or notes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs">
          {["ALL", "DRAFT", "ACTIVE", "FINALIZED", "ARCHIVED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === status
                  ? "bg-emerald-700 text-white font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {status === "ALL" ? `All (${trips.length})` : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Trip Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span>Loading Umrah trips from Neon PostgreSQL...</span>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <Compass className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No trips found matching your filter.</p>
          <p className="text-xs text-slate-400 mt-1">
            Get started by creating your first trip for the upcoming season.
          </p>
          <Link
            href="/trips/new"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800"
          >
            <Plus className="w-3.5 h-3.5" /> Create Trip
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
                  {/* Top Bar: Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 leading-snug">
                        {trip.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {start.toLocaleDateString()} ➔ {end.toLocaleDateString()}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-emerald-700">{daysDiff} Days</span>
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

                  {/* Metrics Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-100 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                        <Users className="w-3 h-3" /> Pilgrims
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 mt-0.5">
                        {trip.expectedPilgrims} pax
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                        <Bus className="w-3 h-3" /> Group Bus
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 mt-0.5">
                        {busPerPerson.toFixed(1)} SAR
                        <span className="text-[10px] text-slate-400 font-normal"> /pax</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                        <Plane className="w-3 h-3" /> Flight Cost
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 mt-0.5">
                        {trip.flightCost.toLocaleString()} {trip.flightCurrency}
                      </div>
                    </div>
                  </div>

                  {/* Inherited Exchange Rates */}
                  <div className="flex items-center gap-3 mt-3 px-3 py-1.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-[11px] text-emerald-900">
                    <Globe className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Trip SAR/MAD: <strong>{trip.sarToMadRate}</strong></span>
                    <span className="text-emerald-300">|</span>
                    <span>EUR/MAD: <strong>{trip.eurToMadRate}</strong></span>
                    <span className="text-emerald-300">|</span>
                    <span className="text-emerald-700 font-semibold">{trip.offersCount} Packages</span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(trip.id, trip.name)}
                      disabled={isBusy}
                      className="p-1.5 text-xs text-slate-600 hover:text-emerald-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 border border-slate-200 cursor-pointer"
                      title="Duplicate Trip (Preserves historical isolation)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Duplicate</span>
                    </button>

                    <button
                      onClick={() => handleToggleArchive(trip.id, trip.name)}
                      disabled={isBusy}
                      className="p-1.5 text-xs text-slate-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1 border border-slate-200 cursor-pointer"
                      title={trip.status === "ARCHIVED" ? "Unarchive Trip" : "Archive Trip"}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {trip.status === "ARCHIVED" ? "Activate" : "Archive"}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/trips/${trip.id}/edit`}
                      className="p-1.5 text-xs text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 border border-slate-200"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>

                    <Link
                      href={`/trips/${trip.id}`}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-2xs"
                    >
                      <span>Workspace</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
