import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { VehicleType } from "@prisma/client";

export const dynamic = "force-dynamic";

const createRouteSchema = z.object({
  routeName: z.string().min(3, "Route name must be at least 3 characters"),
  origin: z.string().optional(),
  destination: z.string().optional(),
  vehicleType: z.nativeEnum(VehicleType),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  baseCostSar: z.number().min(0, "Price in SAR must be non-negative"),
  vatIncluded: z.boolean().default(true),
  seasonalNote: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

// GET: List all routes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleType = searchParams.get("vehicleType") as VehicleType | null;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const items = await prisma.globalTransportCatalogItem.findMany({
      where: {
        ...(vehicleType ? { vehicleType } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ routeName: "asc" }, { capacity: "asc" }],
    });

    return NextResponse.json({
      success: true,
      items: items.map((i) => ({
        ...i,
        baseCostSar: Number(i.baseCostSar),
      })),
    });
  } catch (error) {
    console.error("Error fetching transport catalog:", error);
    return NextResponse.json(
      { error: "Failed to retrieve transportation catalog" },
      { status: 500 }
    );
  }
}

// POST: Add new transport catalog route
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const parsed = createRouteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const newItem = await prisma.globalTransportCatalogItem.create({
      data: {
        routeName: data.routeName,
        origin: data.origin || null,
        destination: data.destination || null,
        vehicleType: data.vehicleType,
        capacity: data.capacity,
        baseCostSar: data.baseCostSar,
        vatIncluded: data.vatIncluded,
        seasonalNote: data.seasonalNote || null,
        notes: data.notes || null,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Transportation route created in Neon database",
        item: {
          ...newItem,
          baseCostSar: Number(newItem.baseCostSar),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating transport catalog item:", error);
    const message = error instanceof Error ? error.message : "Request failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
