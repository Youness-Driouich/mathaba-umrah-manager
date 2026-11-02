"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Compass, Bus, Settings, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileTabs = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Trips", href: "/trips", icon: Compass },
  { name: "Transport", href: "/transport-catalog", icon: Bus },
  { name: "Offers", href: "/offers", icon: Layers },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around">
        {mobileTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-emerald-700 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <tab.icon className={cn("w-5 h-5 mb-0.5", isActive && "stroke-[2.5px]")} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
