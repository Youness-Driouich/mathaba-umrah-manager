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
          throw new Error(data.error || "Failed to load trip");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading trip");
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
        throw new Error(data.error || "Update failed.");
      }

      router.push(`/trips/${tripId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating trip.");
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
        <span>Loading trip for editing...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <Link
          href={`/trips/${tripId}`}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-6 h-6 text-emerald-700" />
            <span>Edit Umrah Trip</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Modify trip travel dates, airline information, exchange rates, and bus itinerary.
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
        {/* Section 1: Trip Identity & Dates */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">Trip Identity & Travel Window</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trip Name *
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
                Departure Date *
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
                Return Date *
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
                Expected Pilgrims Count *
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.expectedPilgrims}
                  onChange={(e) =>
                    setFormData({ ...formData, expectedPilgrims: parseInt(e.target.value) || 1 })
                  }
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trip Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TripStatus })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value={TripStatus.DRAFT}>Draft</option>
                <option value={TripStatus.ACTIVE}>Active</option>
                <option value={TripStatus.FINALIZED}>Finalized</option>
                <option value={TripStatus.ARCHIVED}>Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Flights Configuration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Plane className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">Flight Tickets & Cost Allocation</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Airline Carrier Name
              </label>
              <input
                type="text"
                value={formData.airlineName}
                onChange={(e) => setFormData({ ...formData, airlineName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ticket Cost Amount *
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
                Flight Currency
              </label>
              <select
                value={formData.flightCurrency}
                onChange={(e) =>
                  setFormData({ ...formData, flightCurrency: e.target.value as Currency })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value={Currency.MAD}>MAD (Moroccan Dirham)</option>
                <option value={Currency.SAR}>SAR (Saudi Riyal)</option>
                <option value={Currency.EUR}>EUR (Euro)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Flight Cost Allocation
              </label>
              <select
                value={formData.flightAllocationType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    flightAllocationType: e.target.value as CostAllocationType,
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value={CostAllocationType.PER_PERSON}>Per-Person Ticket Price</option>
                <option value={CostAllocationType.GROUP_TOTAL}>Group Total Charter Allocation</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Trip Exchange Rates */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Globe className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">Trip Exchange Rates (to MAD)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SAR / MAD Exchange Rate *
              </label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                required
                value={formData.sarToMadRate}
                onChange={(e) =>
                  setFormData({ ...formData, sarToMadRate: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                EUR / MAD Exchange Rate *
              </label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                required
                value={formData.eurToMadRate}
                onChange={(e) =>
                  setFormData({ ...formData, eurToMadRate: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Standard Group Transportation (Bus) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bus className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">Standard Group Bus Transportation</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Group Bus Cost (SAR) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.groupBusCostSar}
                onChange={(e) =>
                  setFormData({ ...formData, groupBusCostSar: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Number of Buses
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.groupBusCount}
                onChange={(e) =>
                  setFormData({ ...formData, groupBusCount: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                Allocated Bus Cost Per Pilgrim
              </span>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">
                {busCostPerPilgrimSar.toFixed(2)} SAR
              </div>
              <div className="text-[11px] font-semibold text-emerald-700">
                ≈ {busCostPerPilgrimMad.toFixed(2)} MAD
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Trip Notes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Trip Internal Notes
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={`/trips/${tripId}`}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Updating in Neon...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Update Trip</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
