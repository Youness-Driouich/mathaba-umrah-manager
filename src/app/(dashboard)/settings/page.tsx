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
  updatedAt?: string;
}

export default function GlobalSettingsPage() {
  const [formData, setFormData] = useState<GlobalSettingsData>({
    agencyName: "Mathaba Umrah Services",
    agencyEmail: "contact@mathaba.agency",
    agencyPhone: "+212 522 000 000",
    agencyAddress: "Casablanca, Morocco",
    defaultVisaCostSar: 525,
    sarToMadRate: 2.7,
    eurToMadRate: 10.85,
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
          updatedAt: data.settings.updatedAt,
        });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to connect to Neon database." });
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
        throw new Error(data.error || "Failed to save settings");
      }

      setMessage({ type: "success", text: "Global settings successfully updated in Neon PostgreSQL!" });
      if (data.settings?.updatedAt) {
        setFormData((prev) => ({ ...prev, updatedAt: data.settings.updatedAt }));
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving settings.",
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
          <span>Loading global settings from Neon PostgreSQL...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-emerald-700" />
            <span>Global Agency Settings</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure reference prices, default currency rates, and agency branding persisted in Neon PostgreSQL.
          </p>
        </div>

        {formData.updatedAt && (
          <div className="text-right text-[11px] text-slate-400">
            Last synced: {new Date(formData.updatedAt).toLocaleDateString()} at{" "}
            {new Date(formData.updatedAt).toLocaleTimeString()}
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

      {/* Critical Business Notice Banner */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Historical Price Protection Rule:</p>
          <p className="text-amber-800">
            Reference exchange rates and visa fees configured here serve as <strong>starting defaults for new trips only</strong>.
            Existing trips and finalized quotations preserve their historical snapshots and will never automatically drift when these global defaults change.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Agency Brand & Identity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">Agency Brand & Contact Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Agency Name
              </label>
              <input
                type="text"
                required
                value={formData.agencyName}
                onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Agency Official Email
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
                Contact Phone / WhatsApp
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
                Headquarters Address
              </label>
              <input
                type="text"
                value={formData.agencyAddress}
                onChange={(e) => setFormData({ ...formData, agencyAddress: e.target.value })}
                placeholder="Casablanca, Morocco"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Reference Visa Pricing */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Coins className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">Reference Visa Pricing</h2>
          </div>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Umrah Visa Fee (SAR per pilgrim)
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
                SAR
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Default baseline: 525.00 SAR per pilgrim. Automatically applied when initializing new Umrah trips.
            </p>
          </div>
        </div>

        {/* Section 3: Reference Currency Rates */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Globe className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-slate-900">Reference Exchange Rates (to MAD)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SAR / MAD Reference Rate
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
                  MAD
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                1 Saudi Riyal (SAR) in Moroccan Dirhams (MAD).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                EUR / MAD Reference Rate
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
                  MAD
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                1 Euro (EUR) in Moroccan Dirhams (MAD).
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving to Neon...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Global Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
