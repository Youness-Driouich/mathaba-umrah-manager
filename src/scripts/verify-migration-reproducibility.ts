import prisma from "../lib/prisma";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

async function main() {
  console.log("================================================================================");
  console.log(" STEP 1: MIGRATION REPRODUCIBILITY AUDIT ON DISPOSABLE SCHEMA");
  console.log("================================================================================");

  try {
    // 1. Verify connection and current database
    const infoRes: any = await prisma.$queryRawUnsafe(
      "SELECT current_database(), current_user, version();"
    );
    console.log("1. Connected to Neon PostgreSQL:", infoRes[0].current_database, "as", infoRes[0].current_user);

    // 2. Read migration file
    const migrationSqlPath = path.join(process.cwd(), "prisma", "migrations", "0_init", "migration.sql");
    const migrationSql = fs.readFileSync(migrationSqlPath, "utf-8");
    console.log(`2. Read migration SQL (${migrationSql.length} bytes, ${migrationSqlPath})`);

    // 3. Create a disposable isolated schema for verification
    const testSchema = "disposable_migration_audit";
    console.log(`3. Setting up isolated test schema: ${testSchema}...`);
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE;`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA ${testSchema};`);

    // 4. In PostgreSQL, split migration SQL into individual executable statements
    // and execute within the disposable schema
    console.log("4. Applying migration SQL from scratch into isolated schema...");
    
    // Strip line comments
    const cleanSql = migrationSql.replace(/--.*$/gm, "").trim();

    // Split on semicolons
    const statements = cleanSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`   Executing ${statements.length} migration statements in schema '${testSchema}'...`);
    await prisma.$executeRawUnsafe(`SET search_path TO ${testSchema}, public;`);

    for (const stmt of statements) {
      if (stmt.length > 0) {
        await prisma.$executeRawUnsafe(`${stmt};`);
      }
    }
    console.log("✓ All migration statements executed successfully from scratch with 0 errors!");

    // 5. Query created tables in isolated schema
    const createdTablesRes: any = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = '${testSchema}'
      ORDER BY table_name;
    `);
    const createdTables = createdTablesRes.map((r: any) => r.table_name);
    console.log(`5. Created ${createdTables.length} tables in isolated schema:`, createdTables.join(", "));

    // Expected tables from Prisma schema (mapped table names)
    const expectedTables = [
      "users",
      "sessions",
      "global_settings",
      "global_transport_catalog",
      "global_service_catalog",
      "umrah_trips",
      "offers",
      "offer_hotel_stays",
      "offer_additional_transports",
      "offer_services",
      "offer_train_expenses",
      "individual_pilgrim_quotes",
      "quote_customization_items",
    ];

    const missingTables = expectedTables.filter((t) => !createdTables.includes(t));
    if (missingTables.length > 0) {
      throw new Error(`Migration verification failed! Missing tables: ${missingTables.join(", ")}`);
    }
    console.log("✓ All 13 expected Prisma models have corresponding tables in the migrated schema!");

    // 6. Check columns and types for key tables
    const quoteCols: any = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = '${testSchema}' AND table_name = 'individual_pilgrim_quotes'
      ORDER BY column_name;
    `);
    console.log(`6. individual_pilgrim_quotes columns (${quoteCols.length}):`, quoteCols.map((r: any) => r.column_name).join(", "));

    // 7. Clean up disposable schema
    console.log(`7. Cleaning up isolated disposable schema: ${testSchema}...`);
    await prisma.$executeRawUnsafe(`SET search_path TO public;`);
    await prisma.$executeRawUnsafe(`DROP SCHEMA ${testSchema} CASCADE;`);
    console.log("✓ Isolated schema dropped. Real production tables untouched!");

    // 8. Verify status of migrations against real database
    console.log("\n8. Checking Prisma Migration Status on primary database...");
    const migrateStatus = execSync("npx prisma migrate status", { encoding: "utf-8" });
    console.log(migrateStatus.trim());

    // 9. Verify diff against schema
    console.log("\n9. Checking Prisma Schema Diff...");
    const migrateDiff = execSync("npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma", { encoding: "utf-8" });
    console.log(migrateDiff.trim());

    console.log("\n================================================================================");
    console.log(" MIGRATION REPRODUCIBILITY AUDIT: 100% PASSED");
    console.log("================================================================================");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Migration audit failed:", err);
  process.exit(1);
});
