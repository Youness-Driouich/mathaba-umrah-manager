-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF', 'AGENT');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('MAD', 'SAR', 'EUR');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('SEDAN', 'GMC', 'STARIA', 'HIACE', 'COASTER', 'BUS');

-- CreateEnum
CREATE TYPE "City" AS ENUM ('MAKKAH', 'MADINAH');

-- CreateEnum
CREATE TYPE "RoomCategory" AS ENUM ('SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD');

-- CreateEnum
CREATE TYPE "CostAllocationType" AS ENUM ('PER_PERSON', 'GROUP_TOTAL');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomizationType" AS ENUM ('ADD_PRIVATE_TRANSPORT', 'REMOVE_SERVICE', 'REPLACE_SERVICE', 'ADDON');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "agencyName" TEXT NOT NULL DEFAULT 'Mathaba Umrah Services',
    "agencyLogoUrl" TEXT,
    "agencyPhone" TEXT,
    "agencyEmail" TEXT,
    "agencyAddress" TEXT,
    "defaultVisaCostSar" DECIMAL(10,2) NOT NULL DEFAULT 525.00,
    "sarToMadRate" DECIMAL(10,4) NOT NULL DEFAULT 2.70,
    "eurToMadRate" DECIMAL(10,4) NOT NULL DEFAULT 10.85,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_transport_catalog" (
    "id" TEXT NOT NULL,
    "routeName" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "baseCostSar" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_transport_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_service_catalog" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "defaultCost" DECIMAL(10,2) NOT NULL,
    "defaultCurrency" "Currency" NOT NULL DEFAULT 'SAR',
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_service_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "umrah_trips" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "expectedPilgrims" INTEGER NOT NULL DEFAULT 40,
    "flightCost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "flightCurrency" "Currency" NOT NULL DEFAULT 'MAD',
    "flightAllocationType" "CostAllocationType" NOT NULL DEFAULT 'PER_PERSON',
    "sarToMadRate" DECIMAL(10,4) NOT NULL DEFAULT 2.70,
    "eurToMadRate" DECIMAL(10,4) NOT NULL DEFAULT 10.85,
    "groupBusCostSar" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "groupBusCount" INTEGER NOT NULL DEFAULT 1,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "umrah_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fixedProfitMad" DECIMAL(10,2) NOT NULL DEFAULT 2000.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_hotel_stays" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "city" "City" NOT NULL,
    "hotelName" TEXT NOT NULL,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "nightsCount" INTEGER NOT NULL,
    "isNightsOverridden" BOOLEAN NOT NULL DEFAULT false,
    "singleDoubleRateSar" DECIMAL(10,2) NOT NULL,
    "tripleRateSar" DECIMAL(10,2) NOT NULL,
    "quadRateSar" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_hotel_stays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_services" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "costAmount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'SAR',
    "costScope" "CostAllocationType" NOT NULL DEFAULT 'PER_PERSON',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_train_expenses" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "routeName" TEXT NOT NULL,
    "ticketPriceSar" DECIMAL(10,2) NOT NULL,
    "passengerCount" INTEGER NOT NULL DEFAULT 1,
    "isIncluded" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_train_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "individual_pilgrim_quotes" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "pilgrimName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "roomCategory" "RoomCategory" NOT NULL DEFAULT 'DOUBLE',
    "overrideProfitMad" DECIMAL(10,2),
    "commercialDiscountMad" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "arbitraryAdjustmentMad" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "adjustmentReason" TEXT,
    "snapshotData" JSONB,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "individual_pilgrim_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_customization_items" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "type" "CustomizationType" NOT NULL,
    "description" TEXT NOT NULL,
    "supplierCostDeltaMad" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "sellingPriceDeltaMad" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_customization_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "umrah_trips_slug_key" ON "umrah_trips"("slug");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "umrah_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_hotel_stays" ADD CONSTRAINT "offer_hotel_stays_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_services" ADD CONSTRAINT "offer_services_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_train_expenses" ADD CONSTRAINT "offer_train_expenses_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "individual_pilgrim_quotes" ADD CONSTRAINT "individual_pilgrim_quotes_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_customization_items" ADD CONSTRAINT "quote_customization_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "individual_pilgrim_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

