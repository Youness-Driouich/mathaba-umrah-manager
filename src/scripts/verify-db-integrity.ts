import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking Neon DB connection and existing records...");
  const settingsCount = await prisma.globalSetting.count();
  const transportCount = await prisma.globalTransportCatalogItem.count();
  const tripsCount = await prisma.umrahTrip.count();
  const offersCount = await prisma.offer.count();
  const staysCount = await prisma.offerHotelStay.count();
  const addTransCount = await prisma.offerAdditionalTransport.count();
  const trainCount = await prisma.offerTrainExpense.count();
  const quotesCount = await prisma.individualPilgrimQuote.count();

  console.log("Database Stats:", {
    settingsCount,
    transportCount,
    tripsCount,
    offersCount,
    staysCount,
    addTransCount,
    trainCount,
    quotesCount,
  });

  const settings = await prisma.globalSetting.findFirst();
  console.log("Default Visa Fee:", settings?.defaultVisaCostSar.toString());
  console.log("Exchange Rates:", {
    sarToMad: settings?.sarToMadRate.toString(),
    eurToMad: settings?.eurToMadRate.toString(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
