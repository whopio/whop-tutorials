import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { initiatePayment } from "@/services/payments";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimit(request);
    if (limited) return limited;

    const user = await requireAuth();
    const { id } = await params;

    const trade = await prisma.trade.findUnique({
      where: { id },
    });

    if (!trade) {
      return NextResponse.json(
        { error: "Trade not found" },
        { status: 404 }
      );
    }

    if (trade.buyerId !== user.id) {
      return NextResponse.json(
        { error: "Only the buyer can initiate payment" },
        { status: 403 }
      );
    }

    const checkout = await initiatePayment(trade.id);

    return NextResponse.json({ checkoutUrl: checkout.checkoutUrl });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Failed to create checkout:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
