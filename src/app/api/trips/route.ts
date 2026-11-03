import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { CostAllocationType, Currency, TripStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${Date.now().toString().slice(-6)}`;
}

const createTripSchema = z.object({
  name: z.string().min(3, "Trip name must be at least 3 characters"),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  expectedPilgrims: z.number().int().min(1, "Expected pilgrims must be at least 1"),
  airlineName: z.string().optional().nullable(),
  flightCost: z.number().min(0, "Flight cost must be non-negative").default(0),
  flightCurrency: z.nativeEnum(Currency).default(Currency.MAD),
  flightAllocationType: z.nativeEnum(CostAllocationType).default(CostAllocationType.PER_PERSON),
  sarToMadRate: z.number().gt(0, "SAR to MAD rate must be greater than zero").optional(),
  eurToMadRate: z.number().gt(0, "EUR to MAD rate must be greater than zero").optional(),
  groupBusCostSar: z.number().min(0).default(0),
  groupBusCount: z.number().int().min(1).default(1),
  visaCostSar: z.number().min(0).optional(),
  status: z.nativeEnum(TripStatus).default(TripStatus.DRAFT),
  notes: z.string().optional().nullable(),
});

// GET: List all trips with optional filtering and search
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") as TripStatus | null;

    const trips = await prisma.umrahTrip.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { airlineName: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: { offers: true },
        },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({
      success: true,
      trips: trips.map((t) => ({
        ...t,
        flightCost: Number(t.flightCost),
        sarToMadRate: Number(t.sarToMadRate),
        eurToMadRate: Number(t.eurToMadRate),
        groupBusCostSar: Number(t.groupBusCostSar),
        visaCostSar: Number(t.visaCostSar),
        offersCount: t._count.offers,
      })),
    });
  } catch (error) {
    console.error("Error retrieving trips:", error);
    return NextResponse.json(
      { error: "Failed to retrieve trips list" },
      { status: 500 }
    );
  }
}

// POST: Create a new Umrah trip
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const parsed = createTripSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Fetch default global settings if rates or visa fee are not provided
    const globalSettings = await prisma.globalSetting.findUnique({
      where: { id: "default" },
    });

    const sarRate = data.sarToMadRate ?? Number(globalSettings?.sarToMadRate ?? 2.70);
    const eurRate = data.eurToMadRate ?? Number(globalSettings?.eurToMadRate ?? 10.85);
    const visaFee = data.visaCostSar ?? Number(globalSettings?.defaultVisaCostSar ?? 525.00);

    const slug = generateSlug(data.name);

    const trip = await prisma.umrahTrip.create({
      data: {
        name: data.name,
        slug,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        expectedPilgrims: data.expectedPilgrims,
        airlineName: data.airlineName || null,
        flightCost: data.flightCost,
        flightCurrency: data.flightCurrency,
        flightAllocationType: data.flightAllocationType,
        sarToMadRate: sarRate,
        eurToMadRate: eurRate,
        groupBusCostSar: data.groupBusCostSar,
        groupBusCount: data.groupBusCount,
        visaCostSar: visaFee,
        status: data.status,
        notes: data.notes || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Trip created successfully in Neon database",
        trip: {
          ...trip,
          flightCost: Number(trip.flightCost),
          sarToMadRate: Number(trip.sarToMadRate),
          eurToMadRate: Number(trip.eurToMadRate),
          groupBusCostSar: Number(trip.groupBusCostSar),
          visaCostSar: Number(trip.visaCostSar),
          offersCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating trip:", error);
    const message = error instanceof Error ? error.message : "Creation failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
