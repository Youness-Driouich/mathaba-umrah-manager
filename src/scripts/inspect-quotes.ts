import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const quotes = await p.individualPilgrimQuote.findMany({
    include: { customizations: true },
  });
  console.log("Total Quotes:", quotes.length);
  for (const q of quotes) {
    console.log(q.id, q.pilgrimName);
    console.log("  Room Category:", q.roomCategory);
    console.log("  Discount:", q.commercialDiscountMad);
    console.log("  Customizations count:", q.customizations.length);
    for (const c of q.customizations) {
      console.log("    - Type:", c.type, "Desc:", c.description, "CostDelta:", c.supplierCostDeltaMad, "SellingDelta:", c.sellingPriceDeltaMad);
    }
  }
}
main().catch(console.error).finally(() => p.$disconnect());
