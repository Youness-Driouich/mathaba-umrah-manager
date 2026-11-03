import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/session";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ quoteId: string; itemId: string }> }
) {
  try {
    await requireAdmin();
    const { quoteId, itemId } = await params;

    const item = await prisma.quoteCustomizationItem.findFirst({
      where: { id: itemId, quoteId },
    });

    if (!item) {
      return NextResponse.json({ error: "Customization item not found" }, { status: 404 });
    }

    await prisma.quoteCustomizationItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true, message: "Customization item removed" });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: "Unauthorized" }, { status: error.status });
    }
    console.error("Error deleting customization item:", error);
    return NextResponse.json({ error: "Failed to delete customization item" }, { status: 500 });
  }
}
