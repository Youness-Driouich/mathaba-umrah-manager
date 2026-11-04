import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isChromiumAvailable } from "@/core/documents/browser";
import { DOCUMENT_NO_CACHE_HEADERS } from "@/core/documents/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "unknown";
  let isDbHealthy = false;

  try {
    // Quick, lightweight database ping
    await prisma.$queryRawUnsafe("SELECT 1;");
    dbStatus = "connected";
    isDbHealthy = true;
  } catch (error) {
    console.error("[HealthCheck] Database connection error:", error instanceof Error ? error.message : error);
    dbStatus = "disconnected";
  }

  const chromiumAvailable = isChromiumAvailable();
  const latencyMs = Date.now() - startTime;
  const isHealthy = isDbHealthy && chromiumAvailable;

  const payload = {
    status: isHealthy ? "healthy" : "degraded",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      chromium: chromiumAvailable ? "ready" : "unavailable",
    },
    latencyMs,
    uptimeSeconds: Math.floor(process.uptime()),
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
    headers: DOCUMENT_NO_CACHE_HEADERS,
  });
}
