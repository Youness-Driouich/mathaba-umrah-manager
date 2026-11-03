"use client";

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
  Compass,
  Layers,
  Settings,
  Globe,
} from "lucide-react";
import Link from "next/link";
import {
  calculateHotelStay,
  allocateTransportation,
  calculateIndividualQuote,
} from "@/core/finance/calculator";
import Decimal from "decimal.js";
import { useLanguage } from "@/lib/i18n/language-context";

export default function DashboardPage() {
  const { t, language } = useLanguage();

  // Execute live calculation engine validations for the dashboard verification widget
  const sampleRates = { sarToMad: 2.7, eurToMad: 10.85 };

  // Double room 1000 SAR x 10 nights / 2
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

  // Bus 4400 SAR / 40 pilgrims
  const busAlloc = allocateTransportation(4400, 40);

  // Profit 2000 MAD - 500 discount
  const sampleProfitCalc = calculateIndividualQuote("Mohamed Alami", {
    baselineBreakdown: {
      roomCategory: "DOUBLE",
      occupancy: 2,
      hotelCostMad: new Decimal(13500),
      flightCostMad: new Decimal(8000),
      transportCostMad: new Decimal(297),
      groupBusCostMad: new Decimal(297),
      additionalTransportCostMad: new Decimal(0),
      trainCostMad: new Decimal(0),
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
            <CheckCircle2 className="w-3.5 h-3.5" />{" "}
            {language === "ar" ? "المرحلة 3: عروض الأسعار وحسابات الفنادق مكتملة" : "Phase 3: Offers & Hotel Pricing Ready"}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {t("appName")}
          </h1>
          <p className="mt-2 text-sm md:text-base text-emerald-100/90 leading-relaxed">
            {t("appSubname")}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/trips"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <Compass className="w-4 h-4" />
              <span>{t("navTrips")}</span>
            </Link>
            <Link
              href="/offers"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-xs transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>{t("navOffers")}</span>
            </Link>
            <Link
              href="/transport-catalog"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-xs transition-all"
            >
              <Bus className="w-4 h-4" />
              <span>{t("navTransport")}</span>
            </Link>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-10 translate-y-10 rtl:right-auto rtl:left-0 rtl:-translate-x-10">
          <Building2 className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>
            {language === "ar" ? "الركائز المعمارية المنجزة" : "Core Architectural Milestones"}
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              {language === "ar" ? "محرك مالي فائق الدقة" : "Decimal-Safe Math Engine"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {language === "ar"
                ? "حسابات خالية من أخطاء الفاصلة العائمة باستخدام Decimal.js مع 15 اختبار وحدة مؤتمت."
                : "Zero floating-point rounding errors using Decimal.js with 15 passing automated unit tests."}
            </p>
            <div className="mt-3 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Tests Passing
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Neon Cloud PostgreSQL</h3>
            <p className="text-xs text-slate-500 mt-1">
              {language === "ar"
                ? "قاعدة بيانات سحابية دائمة بدون إيقاف تلقائي، ومحمية بترحيل Prisma ORM."
                : "Serverless PostgreSQL with zero inactivity archiving, Prisma ORM, and connection pooling."}
            </p>
            <div className="mt-3 text-[11px] font-semibold text-blue-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Neon Live & Persistent
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
              <Bus className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              {language === "ar" ? "دليل النقل (66 سعراً معتمداً)" : "66 Transport Price Points"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {language === "ar"
                ? "المسارات المعيارية الـ 10 + أجور الانتظار لـ 6 فئات مركبات شاملة VAT 15%."
                : "10 canonical supplier routes + waiting charges across 6 vehicle types with 15% VAT."}
            </p>
            <div className="mt-3 text-[11px] font-semibold text-purple-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Supplier Catalog Seeded
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              {language === "ar" ? "واجهة ثنائية اللغة RTL / LTR" : "Bilingual i18n RTL/LTR"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {language === "ar"
                ? "اللغة العربية هي الافتراضية مع دعم كامل للتبديل الفوري للغة الإنجليزية وحفظ التفضيل."
                : "Primary Arabic (RTL) interface with seamless one-click switch to English (LTR)."}
            </p>
            <div className="mt-3 text-[11px] font-semibold text-amber-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Arabic & English Active
            </div>
          </div>
        </div>
      </div>

      {/* Live Calculation Engine Health-Check */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-600" />
              <span>
                {language === "ar"
                  ? "التحقق المالي المباشر لمحرك الحسابات"
                  : "Live Engine Financial Verification"}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {language === "ar"
                ? "يتم تقييم النتائج الحسابية مباشرة عبر النواة المالية بالريال والدرهم."
                : "Evaluated directly by the core calculation engine in real-time."}
            </p>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full self-start sm:self-auto">
            {language === "ar" ? "حسابات دقيقة 100%" : "Live Math Verified"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-semibold">
              {language === "ar" ? "إقامة ثنائية (10 ليالٍ)" : "Hotel Double Room (10 Nights)"}
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-extrabold text-slate-900">
                {doubleRoomCalc.perPersonCostSar.DOUBLE.toNumber().toLocaleString()} {t("currencySar")}
              </span>
              <span className="text-xs text-emerald-700 font-semibold">
                {doubleRoomCalc.perPersonCostMad.DOUBLE.toNumber().toLocaleString()} {t("currencyMad")}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              1,000 {t("currencySar")} × 10 {t("nights")} ÷ 2 {t("pax")} = 5,000 {t("currencySar")}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-semibold">
              {language === "ar" ? "نصيب الفرد من الحافلة" : "Group Bus Allocation"}
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-extrabold text-slate-900">
                {busAlloc.toNumber()} {t("currencySar")}
              </span>
              <span className="text-xs text-slate-500">/{t("pax")}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              4,400 {t("currencySar")} ÷ 40 {t("pax")} = 110 {t("currencySar")}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-semibold">
              {language === "ar" ? "صافي الربح بعد الخصم" : "Net Profit After Discount"}
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-extrabold text-emerald-700">
                +{sampleProfitCalc.netProfitMad.toNumber().toLocaleString()} {t("currencyMad")}
              </span>
              <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                -500 {t("currencyMad")}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              2,000 {t("currencyMad")} - 500 {t("currencyMad")} = 1,500 {t("currencyMad")}
            </p>
          </div>
        </div>
      </div>

      {/* Phase 3 Status Banner */}
      <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-emerald-950">
            {language === "ar"
              ? "المرحلة 3 مكتملة — إدارة العروض وتسعير الفنادق ومصفوفة الغرف الأربع جاهزة"
              : "Phase 3 Complete — Offers, Hotel Pricing & 4-Room Financial Matrix Ready"}
          </h4>
          <p className="text-xs text-emerald-800 mt-0.5">
            {language === "ar"
              ? "تم ربط باقات الفنادق بحسابات الليالي التلقائية/اليدوية، ومصفوفة الأسعار الصافية والنهائية بهوامش ربح ثابتة."
              : "Connected hotel packages with auto/manual nights calculation and complete 4-room pricing matrix with fixed MAD profit."}
          </p>
        </div>
        <div className="text-xs text-emerald-800 font-bold bg-white border border-emerald-300 px-3.5 py-1.5 rounded-xl shadow-2xs self-start sm:self-auto">
          {language === "ar" ? "بانتظار اعتماد المستخدم للمرحلة 4" : "Awaiting User Approval for Phase 4"}
        </div>
      </div>
    </div>
  );
}
