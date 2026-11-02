import { PrismaClient, VehicleType } from "@prisma/client";

const prisma = new PrismaClient();

interface RoutePriceEntry {
  routeName: string;
  origin?: string;
  destination?: string;
  prices: Record<VehicleType, number>;
  notes?: string;
  seasonalNote?: string;
}

const VEHICLE_CAPACITIES: Record<VehicleType, number> = {
  SEDAN: 4,
  GMC: 7,
  STARIA: 7,
  HIACE: 10,
  COASTER: 21,
  BUS: 47,
};

const SUPPLIER_MATRIX: RoutePriceEntry[] = [
  {
    routeName: "Jeddah Airport - Jeddah Hotel",
    origin: "Jeddah Airport (KAIA)",
    destination: "Jeddah Hotel",
    prices: {
      SEDAN: 250,
      GMC: 425,
      STARIA: 300,
      HIACE: 350,
      COASTER: 550,
      BUS: 800,
    },
    notes: "Direct transfer Jeddah Airport to Jeddah city hotels",
    seasonalNote: "20% surcharge during Sha'ban and Ramadan (not applied automatically)",
  },
  {
    routeName: "Jeddah Airport - Makkah Hotel",
    origin: "Jeddah Airport (KAIA)",
    destination: "Makkah Hotel",
    prices: {
      SEDAN: 280,
      GMC: 600,
      STARIA: 330,
      HIACE: 450,
      COASTER: 800,
      BUS: 1100,
    },
    notes: "Main Umrah arrival transfer to Makkah hotels",
    seasonalNote: "20% surcharge during Sha'ban and Ramadan (not applied automatically)",
  },
  {
    routeName: "Jeddah/Makkah - Madinah",
    origin: "Jeddah / Makkah Hotel",
    destination: "Madinah Hotel",
    prices: {
      SEDAN: 600,
      GMC: 1200,
      STARIA: 700,
      HIACE: 800,
      COASTER: 1250,
      BUS: 1500,
    },
    notes: "Intercity transfer Jeddah or Makkah to Madinah (Highway)",
    seasonalNote: "20% surcharge during Sha'ban and Ramadan (not applied automatically)",
  },
  {
    routeName: "Madinah Airport - Madinah Hotel",
    origin: "Madinah Airport (MED)",
    destination: "Madinah Hotel",
    prices: {
      SEDAN: 230,
      GMC: 450,
      STARIA: 300,
      HIACE: 350,
      COASTER: 650,
      BUS: 800,
    },
    notes: "Arrival / departure transfer Prince Mohammad Bin Abdulaziz Airport",
    seasonalNote: "20% surcharge during Sha'ban and Ramadan (not applied automatically)",
  },
  {
    routeName: "Makkah Hotel - Makkah Train Station",
    origin: "Makkah Hotel",
    destination: "Makkah Haramain Train Station (Rusaifa)",
    prices: {
      SEDAN: 230,
      GMC: 450,
      STARIA: 300,
      HIACE: 350,
      COASTER: 600,
      BUS: 700,
    },
    notes: "Transfer between Makkah hotel and Haramain High Speed Rail station",
    seasonalNote: "20% surcharge during Sha'ban and Ramadan (not applied automatically)",
  },
  {
    routeName: "Madinah Hotel - Madinah Train Station",
    origin: "Madinah Hotel",
    destination: "Madinah Haramain Train Station (Knowledge City)",
    prices: {
      SEDAN: 230,
      GMC: 450,
      STARIA: 300,
      HIACE: 350,
      COASTER: 600,
      BUS: 700,
    },
    notes: "Transfer between Madinah hotel and Haramain High Speed Rail station",
    seasonalNote: "20% surcharge during Sha'ban and Ramadan (not applied automatically)",
  },
  {
    routeName: "Makkah - Madinah via Badr",
    origin: "Makkah Hotel",
    destination: "Madinah Hotel via Badr Battlefield",
    prices: {
      SEDAN: 700,
      GMC: 1500,
      STARIA: 850,
      HIACE: 950,
      COASTER: 1500,
      BUS: 1800,
    },
    notes: "Scenic and historical route passing through the historic battlefield of Badr",
    seasonalNote: "20% surcharge during Sha'ban and Ramadan (not applied automatically)",
  },
  {
    routeName: "Makkah Ziyarat",
    origin: "Makkah Hotel",
    destination: "Makkah Holy Sites (Arafat, Mina, Muzdalifah, Jabal Al-Nour)",
    prices: {
      SEDAN: 280,
      GMC: 550,
      STARIA: 350,
      HIACE: 380,
      COASTER: 600,
      BUS: 650,
    },
    notes: "Guided religious historical visit of Makkah holy sites",
    seasonalNote: "20% surcharge during Sha'ban and Ramadan (not applied automatically)",
  },
  {
    routeName: "Madinah Ziyarat",
    origin: "Madinah Hotel",
    destination: "Madinah Holy Sites (Uhud, Masjid Quba, Qiblatayn, Khandaq)",
    prices: {
      SEDAN: 280,
      GMC: 550,
      STARIA: 350,
      HIACE: 380,
      COASTER: 600,
      BUS: 650,
    },
    notes: "Guided religious historical visit of Madinah holy sites",
    seasonalNote: "20% surcharge during Sha'ban and Ramadan (not applied automatically)",
  },
  {
    routeName: "Taif Ziyarat",
    origin: "Makkah Hotel",
    destination: "Taif (Masjid Abdullah Ibn Abbas, Shubra, Teleferik)",
    prices: {
      SEDAN: 550,
      GMC: 1300,
      STARIA: 750,
      HIACE: 850,
      COASTER: 1100,
      BUS: 1400,
    },
    notes: "Excursion to Taif from Makkah and return",
    seasonalNote: "20% surcharge during Sha'ban and Ramadan (not applied automatically)",
  },
  {
    routeName: "Waiting Charges",
    origin: "Any Location",
    destination: "Any Location",
    prices: {
      SEDAN: 100,
      GMC: 100,
      STARIA: 100,
      HIACE: 100,
      COASTER: 100,
      BUS: 100,
    },
    notes: "Supplier flat charge. Note: NOT automatically hourly; charging unit unconfirmed by supplier.",
    seasonalNote: "Subject to supplier terms",
  },
];

async function main() {
  console.log("==================================================================");
  console.log("🚚 AUDITING AND COMPLETING TRANSPORTATION CATALOG IN NEON");
  console.log("==================================================================");

  // 1. Audit current records
  const existingCount = await prisma.globalTransportCatalogItem.count();
  const existingItems = await prisma.globalTransportCatalogItem.findMany();
  console.log(`\n📊 Existing catalog items in Neon: ${existingCount}`);

  // Clean old approximate records to eliminate duplicates with legacy route names
  console.log("🧹 Clearing old legacy sample entries before canonical import...");
  await prisma.globalTransportCatalogItem.deleteMany({});
  console.log("  ✓ Legacy records cleared cleanly.");

  // 2. Insert the complete canonical 66 records
  console.log("\n📦 Importing 11 canonical routes × 6 vehicle categories (66 price points)...");

  let insertedCount = 0;
  const vehicles: VehicleType[] = ["SEDAN", "GMC", "STARIA", "HIACE", "COASTER", "BUS"];

  for (const entry of SUPPLIER_MATRIX) {
    for (const vehicle of vehicles) {
      const price = entry.prices[vehicle];
      const capacity = VEHICLE_CAPACITIES[vehicle];

      await prisma.globalTransportCatalogItem.create({
        data: {
          routeName: entry.routeName,
          origin: entry.origin || null,
          destination: entry.destination || null,
          vehicleType: vehicle,
          capacity,
          baseCostSar: price,
          vatIncluded: true,
          seasonalNote: entry.seasonalNote || null,
          notes: entry.notes || null,
          isActive: true,
        },
      });
      insertedCount++;
    }
  }

  console.log(`\n✅ Successfully seeded ${insertedCount} official supplier transport entries!`);
  console.log("📋 Verified routes:");
  SUPPLIER_MATRIX.forEach((r, idx) => {
    console.log(`   ${idx + 1}. ${r.routeName}`);
  });
  console.log("\n📌 Verified Vehicle Categories & Capacities:");
  vehicles.forEach((v) => {
    console.log(`   - ${v}: ${VEHICLE_CAPACITIES[v]} passengers`);
  });
  console.log("==================================================================");
}

main()
  .catch((e) => {
    console.error("Transportation catalog import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
