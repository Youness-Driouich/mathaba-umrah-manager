"use client";

import { PwaRegistrar } from "@/components/pwa/pwa-registrar";
import { BadgeCheck, Globe, Languages } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

interface TopBarProps {
  title?: string;
  subtitle?: string;
}

export function TopBar({
  title,
  subtitle,
}: TopBarProps) {
  const { language, toggleLanguage, t } = useLanguage();

  const displayTitle = title || t("appName");
  const displaySubtitle = subtitle || t("appSubname");

  return (
    <header className="sticky top-0 z-40 h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="md:hidden w-8 h-8 rounded-lg bg-emerald-800 text-amber-300 font-bold flex items-center justify-center text-sm">
          م
        </div>
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-800 leading-tight">
            {displayTitle}
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block">{displaySubtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Language Switcher Pill */}
        <button
          onClick={toggleLanguage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shadow-2xs"
          title={language === "ar" ? "Switch to English" : "التحويل إلى العربية"}
        >
          <Languages className="w-3.5 h-3.5 text-emerald-700" />
          <span>{language === "ar" ? "English" : "العربية"}</span>
        </button>

        {/* PWA Install Button */}
        <PwaRegistrar />

        {/* Currency Rates Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <Globe className="w-3.5 h-3.5 text-emerald-600" />
          <span>SAR/MAD: <strong>2.70</strong></span>
          <span className="text-slate-300">|</span>
          <span>EUR/MAD: <strong>10.85</strong></span>
        </div>

        {/* Administrator Badge */}
        <div className="flex items-center gap-2 pr-2 border-r border-slate-200 rtl:pr-2 rtl:border-r ltr:pl-2 ltr:border-l">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
            {language === "ar" ? "مدير" : "AD"}
          </div>
          <div className="hidden sm:block text-start text-xs">
            <p className="font-semibold text-slate-800">{t("adminBadge")}</p>
            <p className="text-[10px] text-emerald-600 flex items-center gap-1">
              <BadgeCheck className="w-3 h-3 inline" /> {t("activeStatus")}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
