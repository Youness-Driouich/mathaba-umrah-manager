import { PrismaClient, Role, VehicleType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Mathaba Umrah Manager database seed...");

  // 1. Create or ensure Initial Administrator Account securely
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@mathaba.agency";
  const rawPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (!rawPassword) {
    throw new Error(
      "❌ Security Error: INITIAL_ADMIN_PASSWORD environment variable is required. Hardcoded default passwords are prohibited."
    );
  }

  const passwordHash = await bcrypt.hash(rawPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
      name: process.env.INITIAL_ADMIN_NAME || "Mathaba Agency Director",
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: process.env.INITIAL_ADMIN_NAME || "Mathaba Agency Director",
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Seeded Administrator account: ${admin.email} (Role: ${admin.role})`);

  // 2. Initialize Singleton Global Settings
  const globalSetting = await prisma.globalSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      agencyName: "Mathaba Umrah Services",
      agencyEmail: "contact@mathaba.agency",
      agencyPhone: "+212 522 000 000",
      agencyAddress: "Casablanca, Morocco",
      defaultVisaCostSar: 525.0,
      sarToMadRate: 2.7,
      eurToMadRate: 10.85,
    },
  });

  console.log(`✅ Seeded Global Settings: Default Visa = ${globalSetting.defaultVisaCostSar} SAR, SAR/MAD = ${globalSetting.sarToMadRate}`);

  // 3. Populate Transportation Price Catalog
  const sampleRoutes = [
    {
      routeName: "Jeddah Airport -> Makkah Hotel",
      origin: "Jeddah Airport (KAIA)",
      destination: "Makkah Hotel",
      vehicleType: VehicleType.BUS,
      capacity: 47,
      baseCostSar: 1200.0,
      vatIncluded: true,
      seasonalNote: "Standard season rate; Ramadan & peak season subject to seasonal adjustment",
      notes: "Standard air-conditioned 47-seater coach",
    },
    {
      routeName: "Jeddah Airport -> Makkah Hotel",
      origin: "Jeddah Airport (KAIA)",
      destination: "Makkah Hotel",
      vehicleType: VehicleType.GMC,
      capacity: 7,
      baseCostSar: 650.0,
      vatIncluded: true,
      seasonalNote: "Standard rate",
      notes: "VIP Suburban / Yukon XL private transfer (7 passengers)",
    },
    {
      routeName: "Jeddah Airport -> Makkah Hotel",
      origin: "Jeddah Airport (KAIA)",
      destination: "Makkah Hotel",
      vehicleType: VehicleType.STARIA,
      capacity: 7,
      baseCostSar: 450.0,
      vatIncluded: true,
      seasonalNote: "Standard rate",
      notes: "Hyundai Staria private minivan (7 passengers)",
    },
    {
      routeName: "Jeddah Airport -> Makkah Hotel",
      origin: "Jeddah Airport (KAIA)",
      destination: "Makkah Hotel",
      vehicleType: VehicleType.SEDAN,
      capacity: 4,
      baseCostSar: 350.0,
      vatIncluded: true,
      seasonalNote: "Standard rate",
      notes: "Private standard sedan (Camry / Sonata - 4 passengers)",
    },
    {
      routeName: "Makkah Hotel -> Madinah Hotel",
      origin: "Makkah Hotel",
      destination: "Madinah Hotel",
      vehicleType: VehicleType.BUS,
      capacity: 47,
      baseCostSar: 1600.0,
      vatIncluded: true,
      seasonalNote: "Intercity rate",
      notes: "Intercity coach transfer Makkah to Madinah (47 passengers)",
    },
    {
      routeName: "Makkah Hotel -> Madinah Hotel",
      origin: "Makkah Hotel",
      destination: "Madinah Hotel",
      vehicleType: VehicleType.GMC,
      capacity: 7,
      baseCostSar: 1200.0,
      vatIncluded: true,
      seasonalNote: "Intercity VIP rate",
      notes: "Private VIP transfer Makkah to Madinah (7 passengers)",
    },
    {
      routeName: "Madinah Hotel -> Madinah Airport",
      origin: "Madinah Hotel",
      destination: "Madinah Airport (MED)",
      vehicleType: VehicleType.BUS,
      capacity: 47,
      baseCostSar: 900.0,
      vatIncluded: true,
      seasonalNote: "Standard rate",
      notes: "Standard airport departure coach (47 passengers)",
    },
    {
      routeName: "Madinah Hotel -> Madinah Airport",
      origin: "Madinah Hotel",
      destination: "Madinah Airport (MED)",
      vehicleType: VehicleType.GMC,
      capacity: 7,
      baseCostSar: 400.0,
      vatIncluded: true,
      seasonalNote: "Standard rate",
      notes: "Private VIP departure transfer (7 passengers)",
    },
  ];

  for (const item of sampleRoutes) {
    const existing = await prisma.globalTransportCatalogItem.findFirst({
      where: { routeName: item.routeName, vehicleType: item.vehicleType },
    });

    if (!existing) {
      await prisma.globalTransportCatalogItem.create({
        data: item,
      });
    }
  }

  console.log(`✅ Seeded ${sampleRoutes.length} standard transportation catalog routes`);
  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
