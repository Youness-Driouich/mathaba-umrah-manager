import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@mathaba.agency";
  
  // Generate a cryptographically secure 20-character password if not provided
  const newPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(15).toString("base64url");
  const passwordHash = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      isActive: true,
      role: "ADMIN",
    },
    create: {
      email: adminEmail,
      name: process.env.INITIAL_ADMIN_NAME || "Mathaba Agency Director",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log(`✅ Administrator password successfully rotated in Neon for: ${user.email}`);
  console.log("🔒 Password has been updated securely. (Secrets are never logged).");
}

main()
  .catch((e) => {
    console.error("Rotation error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
