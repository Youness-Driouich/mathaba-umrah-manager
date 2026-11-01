import Decimal from "decimal.js";
import { CurrencyCode, ExchangeRates } from "./types";

// Configure Decimal precision (30 significant digits, half-up rounding)
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

/**
 * Converts any currency amount to Moroccan Dirhams (MAD).
 * Standardized rounding to 2 decimal places for final output, with arbitrary internal precision.
 */
export function convertToMad(
  amount: Decimal | number | string,
  fromCurrency: CurrencyCode,
  rates: ExchangeRates
): Decimal {
  const dAmount = new Decimal(amount);

  switch (fromCurrency) {
    case "MAD":
      return dAmount;
    case "SAR": {
      const sarRate = new Decimal(rates.sarToMad);
      if (sarRate.isZero() || sarRate.isNegative()) {
        throw new Error("Invalid SAR to MAD exchange rate");
      }
      return dAmount.times(sarRate);
    }
    case "EUR": {
      const eurRate = new Decimal(rates.eurToMad);
      if (eurRate.isZero() || eurRate.isNegative()) {
        throw new Error("Invalid EUR to MAD exchange rate");
      }
      return dAmount.times(eurRate);
    }
    default:
      throw new Error(`Unsupported currency: ${fromCurrency}`);
  }
}

/**
 * Format a Decimal to a readable currency string with fixed 2 decimal places.
 */
export function formatMoney(
  amount: Decimal | number | string,
  currency: CurrencyCode = "MAD"
): string {
  const dec = new Decimal(amount);
  const formatted = dec.toFixed(2);
  return `${formatted} ${currency}`;
}

/**
 * Round a Decimal to 2 decimal places using half-up rule.
 */
export function roundCurrency(amount: Decimal | number | string): Decimal {
  return new Decimal(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
