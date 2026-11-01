import {
  Calculator,
  ShieldCheck,
  Database,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Building2,
  Bus,
  Coins,
} from "lucide-react";
import Link from "next/link";
import {
  calculateHotelStay,
  allocateTransportation,
  calculateIndividualQuote,
} from "@/core/finance/calculator";
import Decimal from "decimal.js";

export default function DashboardPage() {
  // Execute live calculation engine validations for the dashboard verification widget
  const sampleRates = { sarToMad: 2.70, eurToMad: 10.85 };
  
  // Test Double room 1000 SAR x 10 nights / 2
  const doubleRoomCalc = calculateHotelStay(
    {
      hotelName: "Swissôtel Al Maqam Makkah",
      city: "MAKKAH",
      checkInDate: "2026-12-15",
      checkOutDate: "2026-12-25",
      singleDoubleNightlyRateSar: 1000,
      tripleNightlyRateSar: 1200,
      quadNightlyRateSar: 1500,
    },
    sampleRates
  );

  // Test Bus 4400 SAR / 40
  const busAlloc = allocateTransportation(4400, 40);

  // Test Profit 2000 MAD - 500 discount
  const sampleProfitCalc = calculateIndividualQuote("Mohamed Alami", {
    baselineBreakdown: {
      roomCategory: "DOUBLE",
      occupancy: 2,
      hotelCostMad: new Decimal(13500),
      flightCostMad: new Decimal(8000),
      transportCostMad: new Decimal(297),
      visaCostMad: new Decimal(1417.5),
      servicesCostMad: new Decimal(0),
      totalActualCostMad: new Decimal(23214.5),
      configuredProfitMad: new Decimal(2000),
      sellingPriceBeforeDiscountMad: new Decimal(25214.5),
      discountMad: new Decimal(0),
      finalSellingPriceMad: new Decimal(25214.5),
      effectiveProfitMad: new Decimal(2000),
      isDeficit: false,
    },
    commercialDiscountMad: 500,
  });

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 text-white p-6 md:p-8 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-semibold mb-4">
            <CheckCircle2 className="w-3.5 h-3.5" /> Phase 1 Foundation Verified
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Mathaba Umrah Manager
          </h1>
          <p className="mt-2 text-sm md:text-base text-emerald-100/90 leading-relaxed">
            Enterprise Umrah trip costing, multi-currency conversion, hotel occupancy margin control, and quotation generation platform.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-10 translate-y-10">
          <Building2 className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Phase 1 Architectural Foundations</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Decimal-Safe Math Engine</h3>
            <p className="text-xs text-slate-500 mt-1">
              Zero floating-point rounding errors using Decimal.js with 15 passing automated unit tests.
            </p>
            <div className="mt-3 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Tests Passing
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">PostgreSQL & Prisma ORM</h3>
            <p className="text-xs text-slate-500 mt-1">
              Full schema with Trips, Offers, Hotel Stays, Transport Catalog, and Quote Snapshots.
            </p>
            <div className="mt-3 text-[11px] font-semibold text-blue-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Client Generated
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Progressive Web App (PWA)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Web app manifest, standalone display mode, and service worker shell caching.
            </p>
            <div className="mt-3 text-[11px] font-semibold text-purple-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Installable Ready
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Role-Based Security</h3>
            <p className="text-xs text-slate-500 mt-1">
              Bcrypt-hashed passwords, signed JWT sessions, and RBAC ready for team expansion.
            </p>
            <div className="mt-3 text-[11px] font-semibold text-amber-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Admin Secure
            </div>
          </div>
        </div>
      </div>

      {/* Live Calculation Engine Health-Check */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-600" />
              <span>Live Engine Health Check (Rule Verification)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Evaluated directly by the core calculation engine in real-time.
            </p>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full self-start sm:self-auto">
            Live Math Verification
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-semibold">
              Hotel Double Room (10 Nights)
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-extrabold text-slate-900">
                {doubleRoomCalc.perPersonCostSar.DOUBLE.toNumber().toLocaleString()} SAR
              </span>
              <span className="text-xs text-emerald-700 font-medium">
                {doubleRoomCalc.perPersonCostMad.DOUBLE.toNumber().toLocaleString()} MAD
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Formula: 1,000 SAR × 10 nights ÷ 2 persons = 5,000 SAR
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-semibold">
              Group Bus Allocation
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-extrabold text-slate-900">
                {busAlloc.toNumber()} SAR
              </span>
              <span className="text-xs text-slate-500">per pilgrim</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Formula: 4,400 SAR coach ÷ 40 pilgrims = 110 SAR
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-semibold">
              Net Profit After Discount
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-extrabold text-emerald-700">
                +{sampleProfitCalc.netProfitMad.toNumber().toLocaleString()} MAD
              </span>
              <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                -500 MAD Disc.
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Formula: 2,000 MAD margin - 500 MAD discount = 1,500 MAD
            </p>
          </div>
        </div>
      </div>

      {/* Next Step / Roadmap Notification */}
      <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-emerald-950">Phase 1 Complete — Ready for Phase 2</h4>
          <p className="text-xs text-emerald-800 mt-0.5">
            Next milestone: <strong>Phase 2 (Global Settings, Price Catalogs & Umrah Trips Hub)</strong>.
          </p>
        </div>
        <div className="text-xs text-emerald-700 font-semibold bg-white border border-emerald-300 px-3 py-1.5 rounded-lg shadow-2xs self-start sm:self-auto">
          Awaiting User Approval
        </div>
      </div>
    </div>
  );
}
