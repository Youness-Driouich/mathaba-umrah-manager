import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  calculateStayNights,
  calculateHotelStay,
  allocateTransportation,
  calculateFlightCostPerPilgrim,
  calculateBaselineOffer,
  calculateIndividualQuote,
} from "../../core/finance/calculator";
import {
  convertToMad,
  formatMoney,
  roundCurrency,
} from "../../core/finance/currency";
import {
  projectCustomerFacingQuotation,
  verifyQuotationPrivacy,
} from "../../core/finance/projection";
import {
  ExchangeRates,
  HotelStayInput,
  BaselineOfferCalculationInput,
} from "../../core/finance/types";

describe("Mathaba Umrah Manager — Financial Calculation Engine", () => {
  const standardRates: ExchangeRates = {
    sarToMad: "2.70",
    eurToMad: "10.85",
  };

  // --- MANDATORY TEST 1 & 2: Nights calculation & manual override ---
  describe("Hotel Stay Nights Calculation", () => {
    it("MANDATORY TEST 1: December 15 to December 25 = 10 nights", () => {
      const result = calculateStayNights("2026-12-15", "2026-12-25");
      expect(result.nights).toBe(10);
      expect(result.isOverridden).toBe(false);
    });

    it("MANDATORY TEST 2: A manual override of 11 nights is respected", () => {
      const result = calculateStayNights("2026-12-15", "2026-12-25", 11);
      expect(result.nights).toBe(11);
      expect(result.isOverridden).toBe(true);
    });

    it("Reverts to automatic nights when manual override is null or undefined", () => {
      const result = calculateStayNights("2026-12-15", "2026-12-25", null);
      expect(result.nights).toBe(10);
      expect(result.isOverridden).toBe(false);
    });
  });

  // --- MANDATORY TESTS 3, 4, 5, 6: Room category occupancy pricing ---
  describe("Hotel Room Pricing & Occupancy Breakdown", () => {
    const sampleStay: HotelStayInput = {
      hotelName: "Swissôtel Al Maqam Makkah",
      city: "MAKKAH",
      checkInDate: "2026-12-15",
      checkOutDate: "2026-12-25", // 10 nights
      singleDoubleNightlyRateSar: 1000,
      tripleNightlyRateSar: 1200,
      quadNightlyRateSar: 1500,
    };

    it("MANDATORY TEST 3: Double room: 1,000 SAR × 10 nights ÷ 2 = 5,000 SAR per pilgrim", () => {
      const result = calculateHotelStay(sampleStay, standardRates);
      expect(result.perPersonCostSar.DOUBLE.toNumber()).toBe(5000);
      expect(result.fullRoomTotalCostSar.singleDouble.toNumber()).toBe(10000);
    });

    it("MANDATORY TEST 4: Single room: 1,000 SAR × 10 nights ÷ 1 = 10,000 SAR per pilgrim", () => {
      const result = calculateHotelStay(sampleStay, standardRates);
      expect(result.perPersonCostSar.SINGLE.toNumber()).toBe(10000);
      // Confirms single room uses the exact same nightly room rate as double
      expect(result.fullRoomTotalCostSar.singleDouble.toNumber()).toBe(10000);
    });

    it("MANDATORY TEST 5: Triple room: 1,200 SAR × 10 nights ÷ 3 = 4,000 SAR per pilgrim", () => {
      const result = calculateHotelStay(sampleStay, standardRates);
      expect(result.perPersonCostSar.TRIPLE.toNumber()).toBe(4000);
      expect(result.fullRoomTotalCostSar.triple.toNumber()).toBe(12000);
    });

    it("MANDATORY TEST 6: Quadruple room: 1,500 SAR × 10 nights ÷ 4 = 3,750 SAR per pilgrim", () => {
      const result = calculateHotelStay(sampleStay, standardRates);
      expect(result.perPersonCostSar.QUAD.toNumber()).toBe(3750);
      expect(result.fullRoomTotalCostSar.quad.toNumber()).toBe(15000);
    });

    it("Correctly converts per-person hotel costs to MAD at the trip exchange rate", () => {
      const result = calculateHotelStay(sampleStay, standardRates);
      // Double: 5,000 SAR * 2.70 = 13,500 MAD
      expect(result.perPersonCostMad.DOUBLE.toNumber()).toBe(13500);
      // Single: 10,000 SAR * 2.70 = 27,000 MAD
      expect(result.perPersonCostMad.SINGLE.toNumber()).toBe(27000);
    });
  });

  // --- MANDATORY TESTS 7 & 8: Transportation allocations ---
  describe("Transportation Cost Allocations", () => {
    it("MANDATORY TEST 7: A bus costing 4,400 SAR for 40 pilgrims allocates 110 SAR per pilgrim", () => {
      const allocated = allocateTransportation(4400, 40);
      expect(allocated.toNumber()).toBe(110);
    });

    it("MANDATORY TEST 8: A private transfer costing 600 SAR shared by 3 pilgrims allocates 200 SAR to each", () => {
      const allocated = allocateTransportation(600, 3);
      expect(allocated.toNumber()).toBe(200);
    });

    it("Throws an error if passenger count is zero or negative", () => {
      expect(() => allocateTransportation(4400, 0)).toThrow(
        "Passenger count for transportation allocation must be greater than zero."
      );
    });
  });

  // --- MANDATORY TEST 9: Profit, discounts, and individual exceptions ---
  describe("Profit Margins & Discounts", () => {
    it("MANDATORY TEST 9: A 2,000 MAD per-person profit and a 500 MAD discount produce a remaining profit of 1,500 MAD", () => {
      const baselineMock = {
        roomCategory: "DOUBLE" as const,
        occupancy: 2,
        hotelCostMad: new Decimal(10000),
        flightCostMad: new Decimal(8000),
        transportCostMad: new Decimal(500),
        visaCostMad: new Decimal(1417.5),
        servicesCostMad: new Decimal(200),
        totalActualCostMad: new Decimal(20117.5),
        configuredProfitMad: new Decimal(2000),
        sellingPriceBeforeDiscountMad: new Decimal(22117.5),
        discountMad: new Decimal(0),
        finalSellingPriceMad: new Decimal(22117.5),
        effectiveProfitMad: new Decimal(2000),
        isDeficit: false,
      };

      const customized = calculateIndividualQuote("Hajji Mohamed", {
        baselineBreakdown: baselineMock,
        commercialDiscountMad: 500,
      });

      expect(customized.baseProfitMad.toNumber()).toBe(2000);
      expect(customized.appliedDiscountMad.toNumber()).toBe(500);
      expect(customized.netProfitMad.toNumber()).toBe(1500);
      expect(customized.finalSellingPriceMad.toNumber()).toBe(21617.5);
      expect(customized.isDeficit).toBe(false);
    });

    it("Flags deficit warning when selling price falls below supplier cost", () => {
      const baselineMock = {
        roomCategory: "DOUBLE" as const,
        occupancy: 2,
        hotelCostMad: new Decimal(10000),
        flightCostMad: new Decimal(5000),
        transportCostMad: new Decimal(500),
        visaCostMad: new Decimal(1400),
        servicesCostMad: new Decimal(0),
        totalActualCostMad: new Decimal(16900),
        configuredProfitMad: new Decimal(1000),
        sellingPriceBeforeDiscountMad: new Decimal(17900),
        discountMad: new Decimal(0),
        finalSellingPriceMad: new Decimal(17900),
        effectiveProfitMad: new Decimal(1000),
        isDeficit: false,
      };

      // Apply an excessive discount of 2,000 MAD on a 1,000 MAD profit margin
      const customized = calculateIndividualQuote("Over-discounted Pilgrim", {
        baselineBreakdown: baselineMock,
        commercialDiscountMad: 2000,
      });

      expect(customized.netProfitMad.toNumber()).toBe(-1000);
      expect(customized.finalSellingPriceMad.toNumber()).toBe(15900);
      expect(customized.isDeficit).toBe(true);
    });
  });

  // --- Complete Baseline Offer Calculation ---
  describe("Complete Baseline Offer Matrix", () => {
    it("Calculates complete package with multi-city hotels, flights, and services", () => {
      const offerInput: BaselineOfferCalculationInput = {
        offerName: "October 2026 Tourist Package",
        exchangeRates: standardRates,
        hotelStays: [
          {
            hotelName: "Makkah Clock Royal Tower",
            city: "MAKKAH",
            checkInDate: "2026-10-01",
            checkOutDate: "2026-10-06", // 5 nights
            singleDoubleNightlyRateSar: 1200,
            tripleNightlyRateSar: 1500,
            quadNightlyRateSar: 1800,
          },
          {
            hotelName: "Madinah Hilton",
            city: "MADINAH",
            checkInDate: "2026-10-06",
            checkOutDate: "2026-10-11", // 5 nights
            singleDoubleNightlyRateSar: 800,
            tripleNightlyRateSar: 990,
            quadNightlyRateSar: 1200,
          },
        ],
        flight: {
          amount: 8500,
          currency: "MAD",
          allocation: "PER_PERSON",
        },
        transportation: {
          groupBusTotalSar: 6000,
          groupPilgrimCount: 40, // 150 SAR per pilgrim
        },
        visaCostSar: 525, // 525 * 2.70 = 1,417.50 MAD
        fixedProfitMadPerPilgrim: 3000,
      };

      const result = calculateBaselineOffer(offerInput);

      expect(result.hotelStays.length).toBe(2);
      expect(result.sharedCostsPerPilgrim.groupBusCostSar.toNumber()).toBe(150);
      expect(result.sharedCostsPerPilgrim.groupBusCostMad.toNumber()).toBe(405); // 150 * 2.70
      expect(result.sharedCostsPerPilgrim.visaCostMad.toNumber()).toBe(1417.5);

      // Verify each room category has exactly the configured 3,000 MAD profit
      expect(result.roomBreakdowns.SINGLE.configuredProfitMad.toNumber()).toBe(3000);
      expect(result.roomBreakdowns.DOUBLE.configuredProfitMad.toNumber()).toBe(3000);
      expect(result.roomBreakdowns.TRIPLE.configuredProfitMad.toNumber()).toBe(3000);
      expect(result.roomBreakdowns.QUAD.configuredProfitMad.toNumber()).toBe(3000);

      // Verify Single room costs more than Double room due to 1-person split
      expect(
        result.roomBreakdowns.SINGLE.totalActualCostMad.greaterThan(
          result.roomBreakdowns.DOUBLE.totalActualCostMad
        )
      ).toBe(true);
    });
  });

  // --- MANDATORY TEST 10: Customer quotation confidentiality ---
  describe("Quotation Data Projection & Confidentiality", () => {
    it("MANDATORY TEST 10: A customer-facing quotation never includes internal margin or supplier costs", () => {
      const offerInput: BaselineOfferCalculationInput = {
        offerName: "Premium Package",
        exchangeRates: standardRates,
        hotelStays: [
          {
            hotelName: "Fairmont Makkah",
            city: "MAKKAH",
            checkInDate: "2026-11-01",
            checkOutDate: "2026-11-11", // 10 nights
            singleDoubleNightlyRateSar: 2000,
            tripleNightlyRateSar: 2400,
            quadNightlyRateSar: 2800,
          },
        ],
        flight: { amount: 9000, currency: "MAD", allocation: "PER_PERSON" },
        transportation: { groupBusTotalSar: 4000, groupPilgrimCount: 40 },
        visaCostSar: 525,
        fixedProfitMadPerPilgrim: 4500,
      };

      const offerResult = calculateBaselineOffer(offerInput);

      const customerQuotation = projectCustomerFacingQuotation({
        agencyName: "Mathaba Umrah Services",
        tripName: "November 2026 Umrah",
        offerResult,
        selectedRoomCategory: "DOUBLE",
        pilgrimName: "Ahmed Benali",
        includedServices: [
          "5-Star Hotel in Makkah with Breakfast",
          "Direct flights with Royal Air Maroc",
          "Air-conditioned VIP group bus transfers",
          "Umrah Visa processing",
        ],
        flightIncluded: true,
        transportIncluded: "VIP Bus",
      });

      // 1. Verify required customer attributes are present
      expect(customerQuotation.agencyName).toBe("Mathaba Umrah Services");
      expect(customerQuotation.pilgrimName).toBe("Ahmed Benali");
      expect(customerQuotation.roomCategory).toBe("DOUBLE");
      expect(customerQuotation.finalSellingPriceMad).toBeGreaterThan(0);
      expect(customerQuotation.currency).toBe("MAD");

      // 2. Deep privacy audit: ensure NO forbidden financial metrics exist in the quotation object
      const audit = verifyQuotationPrivacy(customerQuotation as unknown as Record<string, unknown>);
      expect(audit.isSafe).toBe(true);
      expect(audit.leakedFields).toEqual([]);

      // 3. Explicit assertions on absence of sensitive properties
      const rawJson = JSON.stringify(customerQuotation);
      expect(rawJson).not.toContain("profit");
      expect(rawJson).not.toContain("margin");
      expect(rawJson).not.toContain("supplier");
      expect(rawJson).not.toContain("discount");
      expect(rawJson).not.toContain("cost");
    });
  });
});
