import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyMad(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return "0.00 MAD";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatCurrencySar(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return "0.00 SAR";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
}
