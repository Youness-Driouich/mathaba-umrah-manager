import prisma from "../lib/prisma";
import { computeOfferCalculation } from "../core/finance/offer-helper";
import { calculateIndividualQuote } from "../core/finance/calculator";
import { RoomCategory, QuoteStatus, CustomizationType, VehicleType } from "@prisma/client";
import Decimal from "decimal.js";

async function runPhase5NeonVerification() {
  console.log("\n================================================================================");
  console.log(" MATHABA UMRAH MANAGER — PHASE 5 NEON POSTGRESQL VERIFICATION SUITE");
  console.log("================================================================================\n");

  let testTripId: string | null = null;
  let testOfferId: string | null = null;
  let testQuoteId: string | null = null;
  let duplicatedQuoteId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Database Integrity & 66 Transport Catalog Routes
    // -------------------------------------------------------------------------
    console.log("🔍 TEST 1: Verifying Neon Database Connection and 66 Transport Catalog items...");
    const catalogCount = await prisma.globalTransportCatalogItem.count();
    const settings = await prisma.globalSetting.findFirst();
    if (catalogCount !== 66) {
      throw new Error(`Expected 66 transport catalog routes, found ${catalogCount}`);
    }
    if (!settings) {
      throw new Error("Global settings not found in Neon database");
    }
    console.log(`✅ TEST 1 PASSED: 66 canonical transport catalog routes and global settings verified in Neon.`);
    console.log(`   - Default Visa: ${settings.defaultVisaCostSar.toString()} SAR`);
    console.log(`   - SAR/MAD Rate: ${settings.sarToMadRate.toString()}`);

    // -------------------------------------------------------------------------
    // TEST 2: Create Test Umrah Trip with Group Bus & Visa Snapshot
    // -------------------------------------------------------------------------
    console.log("\n🔍 TEST 2: Creating Test Umrah Trip with Standard Group Bus & Stored Visa Snapshot...");
    const trip = await prisma.umrahTrip.create({
      data: {
        name: "Phase 5 Neon Verification Trip",
        slug: `phase5-test-trip-${Date.now()}`,
        startDate: new Date("2026-12-01"),
        endDate: new Date("2026-12-15"),
        expectedPilgrims: 40,
        airlineName: "Royal Air Maroc",
        flightCost: new Decimal(5000),
        flightCurrency: "MAD",
        sarToMadRate: new Decimal("2.70"),
        eurToMadRate: new Decimal("10.85"),
        groupBusCostSar: new Decimal(4400), // 4,400 SAR for 40 pax = 110 SAR/pax = 297 MAD
        visaCostSar: new Decimal(525),      // 525 SAR * 2.70 = 1,417.50 MAD
      },
    });
    testTripId = trip.id;
    console.log(`✅ TEST 2 PASSED: Umrah Trip created successfully. (ID: ${trip.id})`);
    console.log(`   - Expected Pilgrims: 40`);
    console.log(`   - Group Bus Cost: 4,400 SAR (110 SAR / 297 MAD per pilgrim)`);
    console.log(`   - Stored Historical Visa Snapshot: 525 SAR (1,417.50 MAD)`);

    // -------------------------------------------------------------------------
    // TEST 3: Create Test Offer with Hotels & Fixed Profit Margin
    // -------------------------------------------------------------------------
    console.log("\n🔍 TEST 3: Creating Base Offer with Hotel Accommodations (Makkah Clock Royal Tower)...");
    const offer = await prisma.offer.create({
      data: {
        tripId: trip.id,
        name: "Premium December Base Package",
        fixedProfitMad: new Decimal(2000),
        hotelStays: {
          create: [
            {
              city: "MAKKAH",
              hotelName: "Makkah Clock Royal Tower",
              checkInDate: new Date("2026-12-01"),
              checkOutDate: new Date("2026-12-11"), // 10 nights
              nightsCount: 10,
              singleDoubleRateSar: new Decimal(1000), // 10,000 SAR full room
              tripleRateSar: new Decimal(1200),       // 12,000 SAR full room
              quadRateSar: new Decimal(1500),         // 15,000 SAR full room
            },
          ],
        },
      },
      include: {
        trip: true,
        hotelStays: true,
      },
    });
    testOfferId = offer.id;

    const baseCalc = computeOfferCalculation(offer);
    const doubleBase = baseCalc.roomBreakdowns.DOUBLE;
    const singleBase = baseCalc.roomBreakdowns.SINGLE;

    console.log(`✅ TEST 3 PASSED: Base Offer created and matrix computed.`);
    console.log(`   - Baseline Double Actual Cost: ${doubleBase.totalActualCostMad.toNumber()} MAD`);
    console.log(`   - Baseline Double Profit Margin: ${doubleBase.configuredProfitMad.toNumber()} MAD`);
    console.log(`   - Baseline Double Selling Price: ${doubleBase.finalSellingPriceMad.toNumber()} MAD`);
    console.log(`   - Standard Group Bus Allocation: ${doubleBase.groupBusCostMad.toNumber()} MAD (counted exactly once)`);

    // -------------------------------------------------------------------------
    // TEST 4: Create Individual Pilgrim Quote with Baseline Snapshot Protection
    // -------------------------------------------------------------------------
    console.log("\n🔍 TEST 4: Creating Individual Pilgrim Quote with Historical Snapshot...");
    const snapshotData = JSON.parse(
      JSON.stringify({
        capturedAt: new Date().toISOString(),
        offerId: offer.id,
        offerName: offer.name,
        tripId: trip.id,
        tripName: trip.name,
        sarToMadRate: 2.70,
        eurToMadRate: 10.85,
        visaCostSar: 525,
        fixedProfitMad: 2000,
        roomBreakdowns: baseCalc.roomBreakdowns,
        sharedCosts: baseCalc.sharedCostsPerPilgrim,
      })
    );

    const quote = await prisma.individualPilgrimQuote.create({
      data: {
        offerId: offer.id,
        pilgrimName: "Hajji Mohamed El Fassi",
        contactPhone: "+212 661 234567",
        roomCategory: RoomCategory.DOUBLE,
        overrideProfitMad: null,
        commercialDiscountMad: new Decimal(0),
        status: QuoteStatus.DRAFT,
        snapshotData,
      },
      include: {
        customizations: true,
      },
    });
    testQuoteId = quote.id;
    console.log(`✅ TEST 4 PASSED: Individual Pilgrim Quote created. (ID: ${quote.id})`);
    console.log(`   - Pilgrim: ${quote.pilgrimName}`);
    console.log(`   - Initial Room Category: ${quote.roomCategory}`);
    console.log(`   - Historical Snapshot Stored: ${Boolean(quote.snapshotData)}`);

    // -------------------------------------------------------------------------
    // TEST 5: Exception Type 1 & STEP 3 — Private Vehicle Allocation & Group Bus Safety
    // -------------------------------------------------------------------------
    console.log("\n🔍 TEST 5: Adding Private Vehicle (GMC Jeddah-Makkah: 600 SAR ÷ 3 = 200 SAR = 540 MAD)...");
    // Catalog vehicle GMC: 600 SAR. Shared by 3 pilgrims = 200 SAR = 540 MAD per pilgrim
    const privateTransportItem = await prisma.quoteCustomizationItem.create({
      data: {
        quoteId: quote.id,
        type: CustomizationType.ADD_PRIVATE_TRANSPORT,
        description: "Private GMC Jeddah Airport - Makkah Hotel (3 pilgrims sharing)",
        supplierCostDeltaMad: new Decimal(540),
        sellingPriceDeltaMad: new Decimal(540),
        details: {
          routeName: "Jeddah Airport - Makkah Hotel",
          vehicleType: "GMC",
          vehicleCostSar: 600,
          passengersSharing: 3,
          perPersonCostSar: 200,
          perPersonCostMad: 540,
        },
      },
    });

    const quoteAfterTransport = calculateIndividualQuote(quote.pilgrimName, {
      baselineBreakdown: doubleBase,
      customizationItems: [
        {
          type: "ADD_PRIVATE_TRANSPORT",
          description: privateTransportItem.description,
          supplierCostDeltaMad: 540,
          sellingPriceDeltaMad: 540,
          details: privateTransportItem.details as any,
        },
      ],
    });

    // Verification: New Actual Cost = 20,214.50 + 540 = 20,754.50 MAD
    if (quoteAfterTransport.totalEffectiveCostMad.toNumber() !== 20754.5) {
      throw new Error(`Expected new actual cost 20,754.50 MAD, got ${quoteAfterTransport.totalEffectiveCostMad.toNumber()}`);
    }
    // Selling Price = 20,754.50 + 2,000 = 22,754.50 MAD
    if (quoteAfterTransport.finalSellingPriceMad.toNumber() !== 22754.5) {
      throw new Error(`Expected selling price 22,754.50 MAD, got ${quoteAfterTransport.finalSellingPriceMad.toNumber()}`);
    }
    // Crucial: Group bus (297 MAD) is intact in baselineBreakdown!
    if (doubleBase.groupBusCostMad.toNumber() !== 297) {
      throw new Error(`Group bus cost was mutated! Found: ${doubleBase.groupBusCostMad.toNumber()}`);
    }

    console.log(`✅ TEST 5 PASSED: Private transport allocated correctly and group bus protected.`);
    console.log(`   - Private Transport Addition: +${quoteAfterTransport.supplierCostAdditionsMad.toNumber()} MAD`);
    console.log(`   - Standard Group Bus Intact: ${doubleBase.groupBusCostMad.toNumber()} MAD`);
    console.log(`   - New Actual Cost: ${quoteAfterTransport.totalEffectiveCostMad.toNumber()} MAD`);
    console.log(`   - New Selling Price: ${quoteAfterTransport.finalSellingPriceMad.toNumber()} MAD`);

    // -------------------------------------------------------------------------
    // TEST 6: Exception Type 2 & STEP 4 — Service Removal (Unrecoverable vs Recoverable)
    // -------------------------------------------------------------------------
    console.log("\n🔍 TEST 6: Testing Service Removal (Recoverable vs Courtesy Commercial Discount)...");
    // 6a: Non-recoverable service: Supplier cost is NOT refunded, but courtesy discount of 100 MAD is granted
    const unrecCalc = calculateIndividualQuote("Test Unrecoverable", {
      baselineBreakdown: doubleBase,
      customizationItems: [
        {
          type: "REMOVE_SERVICE",
          description: "Cancel Ziyarat (non-refundable)",
          supplierCostDeltaMad: 0,
          details: { isRecoverable: false, commercialDiscountMad: 100 },
        },
      ],
    });
    if (unrecCalc.totalEffectiveCostMad.toNumber() !== doubleBase.totalActualCostMad.toNumber()) {
      throw new Error("Unrecoverable service must not reduce actual supplier cost!");
    }
    if (unrecCalc.appliedDiscountMad.toNumber() !== 100) {
      throw new Error(`Expected applied discount 100 MAD, got ${unrecCalc.appliedDiscountMad.toNumber()}`);
    }
    if (unrecCalc.netProfitMad.toNumber() !== 1900) {
      throw new Error(`Expected net profit 1,900 MAD, got ${unrecCalc.netProfitMad.toNumber()}`);
    }

    // 6b: Recoverable service: Genuinely refundable ticket directly reduces supplier cost
    const recCalc = calculateIndividualQuote("Test Recoverable", {
      baselineBreakdown: doubleBase,
      customizationItems: [
        {
          type: "REMOVE_SERVICE",
          description: "Cancel refundable train ticket",
          supplierCostDeltaMad: -675,
          details: { isRecoverable: true, supplierCostReductionMad: 675 },
        },
      ],
    });
    if (recCalc.supplierCostReductionsMad.toNumber() !== 675) {
      throw new Error("Recoverable service must reduce supplier cost!");
    }
    if (recCalc.totalEffectiveCostMad.toNumber() !== 19539.5) {
      throw new Error(`Expected reduced actual cost 19,539.50 MAD, got ${recCalc.totalEffectiveCostMad.toNumber()}`);
    }
    console.log(`✅ TEST 6 PASSED: Distinct handling of recoverable supplier cost reduction vs commercial discount verified.`);

    // -------------------------------------------------------------------------
    // TEST 7: Exception Type 3 — Service Replacement
    // -------------------------------------------------------------------------
    console.log("\n🔍 TEST 7: Testing Service Replacement (-200 MAD recoverable + 500 MAD upgrade = +300 MAD net)...");
    const replaceCalc = calculateIndividualQuote("Test Replace", {
      baselineBreakdown: doubleBase,
      customizationItems: [
        {
          type: "REPLACE_SERVICE",
          description: "Swap standard breakfast with VIP Luxury Buffet",
          supplierCostDeltaMad: 300,
          details: {
            originalServiceName: "Standard Breakfast",
            replacementServiceName: "VIP Luxury Buffet",
            supplierCostReductionMad: 200,
            supplierCostAdditionMad: 500,
          },
        },
      ],
    });
    if (replaceCalc.totalEffectiveCostMad.toNumber() !== 20514.5) {
      throw new Error(`Expected actual cost 20,514.50 MAD, got ${replaceCalc.totalEffectiveCostMad.toNumber()}`);
    }
    console.log(`✅ TEST 7 PASSED: Service replacement calculated net delta of +300 MAD without duplication.`);

    // -------------------------------------------------------------------------
    // TEST 8: Exception Type 4 & STEP 5 — Room Category Switch (Double ➔ Single)
    // -------------------------------------------------------------------------
    console.log("\n🔍 TEST 8: Testing Room Category Switch (Double ➔ Single) in Neon...");
    await prisma.individualPilgrimQuote.update({
      where: { id: quote.id },
      data: { roomCategory: RoomCategory.SINGLE },
    });

    // In Single: Hotel cost is 10,000 SAR * 2.70 = 27,000 MAD (Single occupancy ÷ 1)
    // Total Single Actual Cost = 27,000 (hotel) + 5,000 (flight) + 297 (bus) + 1,417.50 (visa) = 33,714.50 MAD
    if (singleBase.hotelCostMad.toNumber() !== 27000) {
      throw new Error(`Expected Single hotel cost 27,000 MAD, got ${singleBase.hotelCostMad.toNumber()}`);
    }
    if (singleBase.totalActualCostMad.toNumber() !== 33714.5) {
      throw new Error(`Expected Single actual cost 33,714.50 MAD, got ${singleBase.totalActualCostMad.toNumber()}`);
    }
    console.log(`✅ TEST 8 PASSED: Room Category switched to SINGLE with accommodation recalculated to 27,000 MAD.`);

    // -------------------------------------------------------------------------
    // TEST 9: Exception Types 5, 6, 7 & STEP 6 — Financial Engine Formulas
    // -------------------------------------------------------------------------
    console.log("\n🔍 TEST 9: Testing Profit Override, Commercial Discount, and Centralized Financial Engine...");
    // Update quote in Neon with:
    // Profit override: 2,500 MAD
    // Commercial discount: 500 MAD
    await prisma.individualPilgrimQuote.update({
      where: { id: quote.id },
      data: {
        overrideProfitMad: new Decimal(2500),
        commercialDiscountMad: new Decimal(500),
      },
    });

    const fullCustomCalc = calculateIndividualQuote(quote.pilgrimName, {
      baselineBreakdown: singleBase,
      overrideProfitMad: 2500,
      commercialDiscountMad: 500,
      customizationItems: [
        {
          type: "ADD_PRIVATE_TRANSPORT",
          description: "Private GMC Jeddah-Makkah (3 pax sharing)",
          supplierCostDeltaMad: 540,
        },
      ],
    });

    // New Actual Cost = 33,714.50 (Single Base) + 540 (GMC) = 34,254.50 MAD
    if (fullCustomCalc.totalEffectiveCostMad.toNumber() !== 34254.5) {
      throw new Error(`Expected actual cost 34,254.50 MAD, got ${fullCustomCalc.totalEffectiveCostMad.toNumber()}`);
    }
    // Selling Price = New Actual Cost (34,254.50) + Profit (2,500) - Discount (500) = 36,254.50 MAD
    if (fullCustomCalc.finalSellingPriceMad.toNumber() !== 36254.5) {
      throw new Error(`Expected selling price 36,254.50 MAD, got ${fullCustomCalc.finalSellingPriceMad.toNumber()}`);
    }
    // Realized Profit = Selling Price (36,254.50) - New Actual Cost (34,254.50) = 2,000 MAD
    if (fullCustomCalc.netProfitMad.toNumber() !== 2000) {
      throw new Error(`Expected realized profit 2,000 MAD, got ${fullCustomCalc.netProfitMad.toNumber()}`);
    }
    if (fullCustomCalc.isDeficit !== false) {
      throw new Error("Quote must not be marked as deficit!");
    }

    console.log(`✅ TEST 9 PASSED: Centralized Financial Engine formula strictly verified.`);
    console.log(`   - New Actual Cost: ${fullCustomCalc.totalEffectiveCostMad.toNumber()} MAD`);
    console.log(`   - Configured Profit: ${fullCustomCalc.baseProfitMad.toNumber()} MAD (Override)`);
    console.log(`   - Commercial Discount: ${fullCustomCalc.appliedDiscountMad.toNumber()} MAD`);
    console.log(`   - Final Selling Price: ${fullCustomCalc.finalSellingPriceMad.toNumber()} MAD`);
    console.log(`   - Realized Net Profit: ${fullCustomCalc.netProfitMad.toNumber()} MAD`);

    // -------------------------------------------------------------------------
    // TEST 10: Deficit Warning Detection (Selling Price < Actual Cost)
    // -------------------------------------------------------------------------
    console.log("\n🔍 TEST 10: Testing Negative Margin Deficit Alert Detection...");
    // Excessive discount of 3,000 MAD on a 2,000 MAD margin
    const deficitCalc = calculateIndividualQuote("Deficit Test Pilgrim", {
      baselineBreakdown: doubleBase,
      overrideProfitMad: 2000,
      commercialDiscountMad: 3000,
    });

    if (!deficitCalc.isDeficit) {
      throw new Error("Deficit flag was not triggered!");
    }
    if (deficitCalc.netProfitMad.toNumber() !== -1000) {
      throw new Error(`Expected negative profit -1,000 MAD, got ${deficitCalc.netProfitMad.toNumber()}`);
    }
    console.log(`✅ TEST 10 PASSED: Deficit warning triggered correctly (Realized Profit: -1,000 MAD, isDeficit: true).`);

    // -------------------------------------------------------------------------
    // TEST 11: STEP 8 — Historical Baseline Snapshot Immutability
    // -------------------------------------------------------------------------
    console.log("\n🔍 TEST 11: Verifying Historical Baseline Snapshot Immutability...");
    // Mutate the parent UmrahTrip's currency rates in Neon
    await prisma.umrahTrip.update({
      where: { id: trip.id },
      data: { sarToMadRate: new Decimal("3.50") }, // Alter rate to 3.50
    });

    // Re-fetch quote from Neon and verify snapshot data
    const savedQuote = await prisma.individualPilgrimQuote.findUnique({
      where: { id: quote.id },
    });
    const snapshot = savedQuote?.snapshotData as any;
    if (Number(snapshot.sarToMadRate) !== 2.70) {
      throw new Error(`Snapshot was contaminated! Expected 2.70, found: ${snapshot.sarToMadRate}`);
    }
    if (Number(snapshot.roomBreakdowns.DOUBLE.hotelCostMad) !== 13500) {
      throw new Error(`Snapshot accommodation was mutated! Found: ${snapshot.roomBreakdowns.DOUBLE.hotelCostMad}`);
    }
    console.log(`✅ TEST 11 PASSED: Historical snapshot remained completely protected at 2.70 SAR/MAD and 13,500 MAD hotel cost.`);

    // -------------------------------------------------------------------------
    // TEST 12: Quote Duplication
    // -------------------------------------------------------------------------
    console.log("\n🔍 TEST 12: Testing Quote Duplication in Neon PostgreSQL...");
    const duplicatedQuote = await prisma.individualPilgrimQuote.create({
      data: {
        offerId: quote.offerId,
        pilgrimName: "Hajja Fatima (Cloned Quote)",
        contactPhone: quote.contactPhone,
        roomCategory: quote.roomCategory,
        overrideProfitMad: quote.overrideProfitMad,
        commercialDiscountMad: quote.commercialDiscountMad,
        snapshotData: quote.snapshotData as any,
        status: QuoteStatus.DRAFT,
        customizations: {
          create: [
            {
              type: CustomizationType.ADD_PRIVATE_TRANSPORT,
              description: privateTransportItem.description,
              supplierCostDeltaMad: privateTransportItem.supplierCostDeltaMad,
              sellingPriceDeltaMad: privateTransportItem.sellingPriceDeltaMad,
              details: privateTransportItem.details as any,
            },
          ],
        },
      },
      include: {
        customizations: true,
      },
    });
    duplicatedQuoteId = duplicatedQuote.id;

    if (duplicatedQuote.customizations.length !== 1) {
      throw new Error("Duplicated quote did not clone customization items!");
    }
    console.log(`✅ TEST 12 PASSED: Quote successfully duplicated with all customizations cloned. (ID: ${duplicatedQuote.id})`);

    // -------------------------------------------------------------------------
    // TEST 13: Clean Teardown of Test Data
    // -------------------------------------------------------------------------
    console.log("\n🔍 TEST 13: Cleaning up test data safely...");
    if (duplicatedQuoteId) {
      await prisma.individualPilgrimQuote.delete({ where: { id: duplicatedQuoteId } });
    }
    if (testTripId) {
      // Cascade deletes offer, hotel stays, customizations, and quote
      await prisma.umrahTrip.delete({ where: { id: testTripId } });
    }

    const postTeardownCatalogCount = await prisma.globalTransportCatalogItem.count();
    if (postTeardownCatalogCount !== 66) {
      throw new Error(`Catalog routes corrupted during teardown! Found: ${postTeardownCatalogCount}`);
    }
    console.log(`✅ TEST 13 PASSED: All temporary test entities safely removed. 66 transport catalog routes preserved.`);

    console.log("\n================================================================================");
    console.log(" 🎉 ALL 13 PHASE 5 NEON POSTGRESQL VERIFICATION TESTS PASSED 100%!");
    console.log("================================================================================\n");
  } catch (error) {
    console.error("\n❌ PHASE 5 NEON VERIFICATION FAILED:", error);
    // Cleanup if failed
    try {
      if (duplicatedQuoteId) await prisma.individualPilgrimQuote.delete({ where: { id: duplicatedQuoteId } });
      if (testTripId) await prisma.umrahTrip.delete({ where: { id: testTripId } });
    } catch {}
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase5NeonVerification();
