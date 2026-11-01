import { PrismaClient } from "@prisma/client";
import { verifyPassword } from "../../core/auth/password";
import { createSessionToken, verifySessionToken } from "../../core/auth/token";

const prisma = new PrismaClient();

async function runNeonVerification() {
  console.log("🔍 [1/4] Testing Neon Database Connection & Admin User...");
  const admin = await prisma.user.findUnique({
    where: { email: "admin@mathaba.agency" },
  });

  if (!admin) {
    throw new Error("❌ Administrator account was not found in Neon database!");
  }
  console.log(`  ✓ Found Admin User: ${admin.email}`);
  console.log(`  ✓ Name: ${admin.name}`);
  console.log(`  ✓ Role: ${admin.role}`);
  console.log(`  ✓ Active Status: ${admin.isActive}`);

  console.log("\n🔐 [2/4] Verifying Password Hashing & Authentication...");
  const isCorrect = await verifyPassword("Admin@Mathaba2026!", admin.passwordHash);
  if (!isCorrect) {
    throw new Error("❌ Password verification failed for admin credentials!");
  }
  console.log("  ✓ Correct password successfully verified via bcrypt.");

  const isWrongRejected = !(await verifyPassword("WrongPassword123!", admin.passwordHash));
  if (!isWrongRejected) {
    throw new Error("❌ Incorrect password was erroneously accepted!");
  }
  console.log("  ✓ Incorrect password was strictly rejected.");

  const token = createSessionToken({
    userId: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });
  const decoded = verifySessionToken(token);
  if (!decoded || decoded.userId !== admin.id) {
    throw new Error("❌ JWT session token verification failed!");
  }
  console.log("  ✓ JWT session token created and verified successfully.");

  console.log("\n⚙️ [3/4] Verifying Global Settings & Catalog Data in Neon...");
  const settings = await prisma.globalSetting.findUnique({
    where: { id: "default" },
  });
  if (!settings) {
    throw new Error("❌ Global settings record not found!");
  }
  console.log(`  ✓ Agency Name: ${settings.agencyName}`);
  console.log(`  ✓ Default Visa Fee: ${settings.defaultVisaCostSar.toString()} SAR`);
  console.log(`  ✓ SAR/MAD Rate: ${settings.sarToMadRate.toString()}`);
  console.log(`  ✓ EUR/MAD Rate: ${settings.eurToMadRate.toString()}`);

  const transportRoutesCount = await prisma.globalTransportCatalogItem.count();
  console.log(`  ✓ Active Transport Routes in Neon: ${transportRoutesCount}`);

  console.log("\n💾 [4/4] Verifying Live Persistent Write / Read Round-Trip...");
  const testTrip = await prisma.umrahTrip.create({
    data: {
      name: "Neon Test Umrah Trip",
      slug: `neon-test-${Date.now()}`,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-15"),
      expectedPilgrims: 45,
      flightCost: 8500.0,
      flightCurrency: "MAD",
      sarToMadRate: 2.70,
      eurToMadRate: 10.85,
      groupBusCostSar: 4400.0,
    },
  });
  console.log(`  ✓ Created test trip in Neon: ID=${testTrip.id}, Name="${testTrip.name}"`);

  // Verify read back
  const readBack = await prisma.umrahTrip.findUnique({
    where: { id: testTrip.id },
  });
  if (!readBack || readBack.name !== testTrip.name) {
    throw new Error("❌ Data persistence read-back failed!");
  }
  console.log(`  ✓ Read back verified: ExpectedPilgrims=${readBack.expectedPilgrims}, FlightCost=${readBack.flightCost} MAD`);

  // Cleanup test trip
  await prisma.umrahTrip.delete({
    where: { id: testTrip.id },
  });
  console.log("  ✓ Test trip record cleaned up successfully.");

  console.log("\n=======================================================");
  console.log("🏆 ALL NEON CLOUD DATABASE VERIFICATIONS PASSED 100%!");
  console.log("=======================================================");
}

runNeonVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
