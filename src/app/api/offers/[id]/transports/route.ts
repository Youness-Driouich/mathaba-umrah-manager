import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { VehicleType } from "@prisma/client";
import { validateVehicleCapacity, VEHICLE_CAPACITIES } from "@/core/finance/calculator";

export const dynamic = "force-dynamic";

const createTransportSchema = z.object({
  routeName: z.string().min(2, "Route name must be at least 2 characters"),
  vehicleType: z.nativeEnum(VehicleType),
  vehicleCount: z.number().int().min(1, "Vehicle count must be at least 1").default(1),
  capacityPerVehicle: z.number().int().min(1).optional(),
  allocatedPilgrimsCount: z.number().int().min(1, "Pilgrims count must be at least 1"),
  supplierReferencePrice: z.number().min(0, "Supplier reference price must be non-negative"),
  actualPriceSar: z.number().min(0, "Actual price must be non-negative"),
  isIncludedInPackage: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

// GET: List additional transports for an offer
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;

    const transports = await prisma.offerAdditionalTransport.findMany({
      where: { offerId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      transports: transports.map((t) => ({
        ...t,
        supplierReferencePrice: Number(t.supplierReferencePrice),
        actualPriceSar: Number(t.actualPriceSar),
      })),
    });
  } catch (error) {
    console.error("Error fetching offer transports:", error);
    return NextResponse.json({ error: "Failed to fetch transports" }, { status: 500 });
  }
}

// POST: Add additional transport to an offer
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: offerId } = await params;

    const body = await req.json();
    const parsed = createTransportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const data = parsed.data;
    const capacityPerVehicle = data.capacityPerVehicle ?? (VEHICLE_CAPACITIES[data.vehicleType] || 4);

    // Validate passenger capacity
    const capacityValidation = validateVehicleCapacity(
      data.vehicleType,
      data.allocatedPilgrimsCount,
      data.vehicleCount
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

    const isPriceOverridden = Math.abs(data.actualPriceSar - data.supplierReferencePrice) > 0.001;

    const transport = await prisma.offerAdditionalTransport.create({
      data: {
        offerId,
        routeName: data.routeName,
        vehicleType: data.vehicleType,
        vehicleCount: data.vehicleCount,
        capacityPerVehicle,
        allocatedPilgrimsCount: data.allocatedPilgrimsCount,
        supplierReferencePrice: data.supplierReferencePrice,
        actualPriceSar: data.actualPriceSar,
        isPriceOverridden,
        isIncludedInPackage: data.isIncludedInPackage,
        notes: data.notes || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Additional transport added successfully to offer",
        transport: {
          ...transport,
          supplierReferencePrice: Number(transport.supplierReferencePrice),
          actualPriceSar: Number(transport.actualPriceSar),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating additional transport:", error);
    const message = error instanceof Error ? error.message : "Creation failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
