import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { VehicleType } from "@prisma/client";
import { validateVehicleCapacity, VEHICLE_CAPACITIES } from "@/core/finance/calculator";

export const dynamic = "force-dynamic";

const updateTransportSchema = z.object({
  routeName: z.string().min(2).optional(),
  vehicleType: z.nativeEnum(VehicleType).optional(),
  vehicleCount: z.number().int().min(1).optional(),
  capacityPerVehicle: z.number().int().min(1).optional(),
  allocatedPilgrimsCount: z.number().int().min(1).optional(),
  supplierReferencePrice: z.number().min(0).optional(),
  actualPriceSar: z.number().min(0).optional(),
  isIncludedInPackage: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

// PUT: Update an additional transport item
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ transportId: string }> }
) {
  try {
    await requireAdmin();
    const { transportId } = await params;

    const body = await req.json();
    const parsed = updateTransportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const existing = await prisma.offerAdditionalTransport.findUnique({
      where: { id: transportId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Transport not found" }, { status: 404 });
    }

    const data = parsed.data;
    const vehicleType = data.vehicleType ?? existing.vehicleType;
    const vehicleCount = data.vehicleCount ?? existing.vehicleCount;
    const allocatedPilgrimsCount = data.allocatedPilgrimsCount ?? existing.allocatedPilgrimsCount;
    const capacityPerVehicle = data.capacityPerVehicle ?? existing.capacityPerVehicle ?? (VEHICLE_CAPACITIES[vehicleType] || 4);

    // Validate capacity
    const capacityValidation = validateVehicleCapacity(
      vehicleType,
      allocatedPilgrimsCount,
      vehicleCount
    );

    if (!capacityValidation.isValid) {
      return NextResponse.json(
        {
          error: capacityValidation.message,
          maxCapacity: capacityValidation.maxCapacity,
        },
        { status: 400 }
      );
    }

    const supplierReferencePrice = data.supplierReferencePrice ?? Number(existing.supplierReferencePrice);
    const actualPriceSar = data.actualPriceSar ?? Number(existing.actualPriceSar);
    const isPriceOverridden = Math.abs(actualPriceSar - supplierReferencePrice) > 0.001;

    const updated = await prisma.offerAdditionalTransport.update({
      where: { id: transportId },
      data: {
        ...(data.routeName ? { routeName: data.routeName } : {}),
        vehicleType,
        vehicleCount,
        capacityPerVehicle,
        allocatedPilgrimsCount,
        supplierReferencePrice,
        actualPriceSar,
        isPriceOverridden,
        ...(data.isIncludedInPackage !== undefined ? { isIncludedInPackage: data.isIncludedInPackage } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Additional transport updated successfully",
      transport: {
        ...updated,
        supplierReferencePrice: Number(updated.supplierReferencePrice),
        actualPriceSar: Number(updated.actualPriceSar),
      },
    });
  } catch (error: unknown) {
    console.error("Error updating transport:", error);
    const message = error instanceof Error ? error.message : "Update failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE: Delete an additional transport item
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ transportId: string }> }
) {
  try {
    await requireAdmin();
    const { transportId } = await params;

    await prisma.offerAdditionalTransport.delete({
      where: { id: transportId },
    });

    return NextResponse.json({
      success: true,
      message: "Additional transport removed successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting transport:", error);
    const message = error instanceof Error ? error.message : "Deletion failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
