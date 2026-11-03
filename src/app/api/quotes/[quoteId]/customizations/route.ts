import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";
import { CustomizationType } from "@prisma/client";

export const dynamic = "force-dynamic";

const createCustomizationSchema = z.object({
  type: z.nativeEnum(CustomizationType),
  description: z.string().min(2, "Description is required"),
  supplierCostDeltaMad: z.number(),
  sellingPriceDeltaMad: z.number().default(0),
  details: z.record(z.any()).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    await requireAdmin();
    const { quoteId } = await params;
    const body = await req.json();
    const parsed = createCustomizationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const quote = await prisma.individualPilgrimQuote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const item = await prisma.quoteCustomizationItem.create({
      data: {
        quoteId,
        type: parsed.data.type,
        description: parsed.data.description.trim(),
        supplierCostDeltaMad: parsed.data.supplierCostDeltaMad,
        sellingPriceDeltaMad: parsed.data.sellingPriceDeltaMad,
        details: (parsed.data.details as any) || undefined,
      },
    });

    return NextResponse.json(
      {
        customization: {
          ...item,
          supplierCostDeltaMad: Number(item.supplierCostDeltaMad),
          sellingPriceDeltaMad: Number(item.sellingPriceDeltaMad),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: "Unauthorized" }, { status: error.status });
    }
    console.error("Error creating customization:", error);
    return NextResponse.json({ error: "Failed to create customization" }, { status: 500 });
  }
}
