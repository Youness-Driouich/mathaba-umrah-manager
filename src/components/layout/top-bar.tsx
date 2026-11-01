"use client";

import { PwaRegistrar } from "@/components/pwa/pwa-registrar";
import { BadgeCheck, Globe, Menu } from "lucide-react";

interface TopBarProps {
  title?: string;
  subtitle?: string;
}

export function TopBar({
  title = "Mathaba Umrah Manager",
  subtitle = "Travel Agency Cost Control & Quotation Platform",
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="md:hidden w-8 h-8 rounded-lg bg-emerald-800 text-amber-300 font-bold flex items-center justify-center text-sm">
          M
        </div>
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-800 leading-tight">
            {title}
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* PWA Install Button (renders when available) */}
        <PwaRegistrar />

        {/* Currency Rates Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <Globe className="w-3.5 h-3.5 text-emerald-600" />
          <span>SAR/MAD: <strong>2.70</strong></span>
          <span className="text-slate-300">|</span>
          <span>EUR/MAD: <strong>10.85</strong></span>
        </div>

        {/* Administrator Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
            AD
          </div>
          <div className="hidden sm:block text-left text-xs">
            <p className="font-semibold text-slate-800">Admin Account</p>
            <p className="text-[10px] text-emerald-600 flex items-center gap-1">
              <BadgeCheck className="w-3 h-3 inline" /> Authorized
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
