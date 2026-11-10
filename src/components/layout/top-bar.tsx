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
        {/* زر تثبيت التطبيق PWA */}
        <PwaRegistrar />

        {/* مؤشر أسعار الصرف المرجعية */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium">
          <Globe className="w-3.5 h-3.5 text-emerald-600" />
          <span>الريال: <strong className="text-slate-900 font-bold">2.70 د.م.</strong></span>
          <span className="text-slate-300">|</span>
          <span>اليورو: <strong className="text-slate-900 font-bold">10.85 د.م.</strong></span>
        </div>

        {/* زر التبديل اللغوي */}
        <button
          onClick={toggleLanguage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shadow-2xs"
          title={language === "ar" ? "التبديل إلى الإنجليزية" : "Switch to Arabic"}
        >
          <Languages className="w-3.5 h-3.5 text-emerald-700" />
          <span>{language === "ar" ? "عربي" : "EN"}</span>
        </button>

        {/* شارة المدير العام */}
        <div className="flex items-center gap-2 pr-2 border-r border-slate-200 rtl:pr-2 rtl:border-r ltr:pl-2 ltr:border-l">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
            مدير
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
