import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { VehicleType } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateRouteSchema = z.object({
  routeName: z.string().min(3).optional(),
  origin: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  vehicleType: z.nativeEnum(VehicleType).optional(),
  capacity: z.number().int().min(1).optional(),
  baseCostSar: z.number().min(0).optional(),
  vatIncluded: z.boolean().optional(),
  seasonalNote: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET: Single transport item
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.globalTransportCatalogItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ error: "Route item not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      item: { ...item, baseCostSar: Number(item.baseCostSar) },
    });
  } catch (error) {
    console.error("Error retrieving route item:", error);
    return NextResponse.json({ error: "Failed to fetch route" }, { status: 500 });
  }
}

// PUT: Update transport item
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = updateRouteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await prisma.globalTransportCatalogItem.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({
      success: true,
      message: "Route updated successfully",
      item: { ...updated, baseCostSar: Number(updated.baseCostSar) },
    });
  } catch (error: unknown) {
    console.error("Error updating route item:", error);
    const message = error instanceof Error ? error.message : "Update failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE: Delete route item
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await prisma.globalTransportCatalogItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Route item deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting route item:", error);
    const message = error instanceof Error ? error.message : "Delete failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
