"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  Bus,
  Layers,
  Settings,
  ShieldCheck,
  LogOut,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-context";

export function Sidebar() {
  const pathname = usePathname();
  const { t, language } = useLanguage();

  const navigationItems = [
    { name: t("navDashboard"), href: "/", icon: LayoutDashboard },
    { name: t("navTrips"), href: "/trips", icon: Compass },
    { name: t("navOffers"), href: "/offers", icon: Layers },
    { name: t("navQuotes"), href: "/quotes", icon: Users },
    { name: t("navTransport"), href: "/transport-catalog", icon: Bus },
    { name: t("navReports"), href: "/reports", icon: FileSpreadsheet },
    { name: t("navSettings"), href: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 rtl:border-l rtl:border-r-0 bg-white min-h-screen">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-200 bg-emerald-900 text-white">
        <div className="w-8 h-8 rounded-lg bg-emerald-700 border border-emerald-500/50 flex items-center justify-center font-bold text-amber-300">
          {language === "ar" ? "م" : "M"}
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight tracking-wide">
            {language === "ar" ? "مَثابة" : "MATHABA"}
          </h1>
          <p className="text-[10px] text-emerald-200/80 uppercase tracking-wider font-medium">
            {language === "ar" ? "لإدارة العمرة" : "Umrah Manager"}
          </p>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {language === "ar" ? "القائمة الرئيسية" : "Workspace Navigation"}
        </div>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-50 text-emerald-800 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-normal">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Admin User Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">{t("adminBadge")}</span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
            {t("activeStatus")}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200 hover:border-rose-200 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t("signOut")}</span>
        </button>
      </div>
    </aside>
  );
}
