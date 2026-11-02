import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";

export const dynamic = "force-dynamic";

const updateSettingsSchema = z.object({
  agencyName: z.string().min(2, "Agency name is required"),
  agencyEmail: z.string().email().optional().or(z.literal("")),
  agencyPhone: z.string().optional().or(z.literal("")),
  agencyAddress: z.string().optional().or(z.literal("")),
  defaultVisaCostSar: z.number().min(0, "Visa cost must be positive"),
  sarToMadRate: z.number().gt(0, "SAR to MAD rate must be greater than zero"),
  eurToMadRate: z.number().gt(0, "EUR to MAD rate must be greater than zero"),
});

// GET: Retrieve current global settings
export async function GET() {
  try {
    let settings = await prisma.globalSetting.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.globalSetting.create({
        data: {
          id: "default",
          agencyName: "Mathaba Umrah Services",
          agencyEmail: "contact@mathaba.agency",
          agencyPhone: "+212 522 000 000",
          agencyAddress: "Casablanca, Morocco",
          defaultVisaCostSar: 525.0,
          sarToMadRate: 2.7,
          eurToMadRate: 10.85,
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        id: settings.id,
        agencyName: settings.agencyName,
        agencyLogoUrl: settings.agencyLogoUrl,
        agencyEmail: settings.agencyEmail,
        agencyPhone: settings.agencyPhone,
        agencyAddress: settings.agencyAddress,
        defaultVisaCostSar: Number(settings.defaultVisaCostSar),
        sarToMadRate: Number(settings.sarToMadRate),
        eurToMadRate: Number(settings.eurToMadRate),
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error retrieving global settings:", error);
    return NextResponse.json(
      { error: "Failed to retrieve global settings" },
      { status: 500 }
    );
  }
}

// PUT: Update global settings (Admin only)
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      agencyName,
      agencyEmail,
      agencyPhone,
      agencyAddress,
      defaultVisaCostSar,
      sarToMadRate,
      eurToMadRate,
    } = parsed.data;

    const updated = await prisma.globalSetting.upsert({
      where: { id: "default" },
      update: {
        agencyName,
        agencyEmail: agencyEmail || null,
        agencyPhone: agencyPhone || null,
        agencyAddress: agencyAddress || null,
        defaultVisaCostSar,
        sarToMadRate,
        eurToMadRate,
      },
      create: {
        id: "default",
        agencyName,
        agencyEmail: agencyEmail || null,
        agencyPhone: agencyPhone || null,
        agencyAddress: agencyAddress || null,
        defaultVisaCostSar,
        sarToMadRate,
        eurToMadRate,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Global settings updated successfully in Neon PostgreSQL",
      settings: {
        id: updated.id,
        agencyName: updated.agencyName,
        agencyEmail: updated.agencyEmail,
        agencyPhone: updated.agencyPhone,
        agencyAddress: updated.agencyAddress,
        defaultVisaCostSar: Number(updated.defaultVisaCostSar),
        sarToMadRate: Number(updated.sarToMadRate),
        eurToMadRate: Number(updated.eurToMadRate),
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error("Error updating global settings:", error);
    const message = error instanceof Error ? error.message : "Unauthorized or failed request";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
