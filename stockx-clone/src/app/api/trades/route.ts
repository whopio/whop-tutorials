import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TradeStatus, UserRole, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { ITEMS_PER_PAGE } from "@/constants";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") ?? "buyer";
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

    const where = {
      ...(role === "seller" ? { sellerId: user.id } : { buyerId: user.id }),
      ...(status ? { status: status as TradeStatus } : {}),
    };

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: ITEMS_PER_PAGE,
        skip: (page - 1) * ITEMS_PER_PAGE,
        include: {
          productSize: {
            include: {
              product: {
                select: { id: true, name: true, brand: true, images: true, sku: true },
              },
            },
          },
          buyer: { select: { id: true, username: true, displayName: true } },
          seller: { select: { id: true, username: true, displayName: true } },
          payment: true,
        },
      }),
      prisma.trade.count({ where }),
    ]);

    return NextResponse.json({
      trades,
      pagination: {
        page,
        pageSize: ITEMS_PER_PAGE,
        total,
        totalPages: Math.ceil(total / ITEMS_PER_PAGE),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Failed to fetch trades:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const updateTradeSchema = z.object({
  tradeId: z.string().min(1),
  status: z.nativeEnum(TradeStatus),
});

export async function PATCH(request: NextRequest) {
  try {
    const limited = await rateLimit(request);
    if (limited) return limited;

    const user = await requireAuth();

    const body: unknown = await request.json();
    const parsed = updateTradeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tradeId, status } = parsed.data;

    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { productSize: { include: { product: true } } },
    });

    if (!trade) {
      return NextResponse.json(
        { error: "Trade not found" },
        { status: 404 }
      );
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const isSeller = trade.sellerId === user.id;
    const isBuyer = trade.buyerId === user.id;

    if (!isAdmin && !isSeller && !isBuyer) {
      return NextResponse.json(
        { error: "Not authorized for this trade" },
        { status: 403 }
      );
    }

    const allowedTransitions: Record<string, { to: TradeStatus[]; by: string[] }> = {
      [TradeStatus.PAID]: {
        to: [TradeStatus.SHIPPED],
        by: ["seller"],
      },
      [TradeStatus.SHIPPED]: {
        to: [TradeStatus.AUTHENTICATING],
        by: ["admin"],
      },
      [TradeStatus.AUTHENTICATING]: {
        to: [TradeStatus.VERIFIED, TradeStatus.FAILED],
        by: ["admin"],
      },
      [TradeStatus.VERIFIED]: {
        to: [TradeStatus.DELIVERED],
        by: ["admin"],
      },
    };

    const transition = allowedTransitions[trade.status];
    if (!transition || !transition.to.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${trade.status} to ${status}` },
        { status: 400 }
      );
    }

    const requiredRole = transition.by;
    const hasRole =
      (requiredRole.includes("seller") && isSeller) ||
      (requiredRole.includes("admin") && isAdmin);

    if (!hasRole) {
      return NextResponse.json(
        { error: "You do not have permission for this action" },
        { status: 403 }
      );
    }

    const updated = await prisma.trade.update({
      where: { id: tradeId },
      data: { status },
    });

    const notificationMap: Partial<
      Record<TradeStatus, { type: NotificationType; buyerMsg: string; sellerMsg: string }>
    > = {
      [TradeStatus.SHIPPED]: {
        type: NotificationType.ITEM_SHIPPED,
        buyerMsg: `Your order for ${trade.productSize.product.name} has been shipped.`,
        sellerMsg: `Shipment confirmed for ${trade.productSize.product.name}.`,
      },
      [TradeStatus.VERIFIED]: {
        type: NotificationType.ITEM_VERIFIED,
        buyerMsg: `Your ${trade.productSize.product.name} has been verified authentic!`,
        sellerMsg: `Your item ${trade.productSize.product.name} passed authentication. Payout incoming.`,
      },
      [TradeStatus.FAILED]: {
        type: NotificationType.ITEM_FAILED,
        buyerMsg: `Authentication failed for ${trade.productSize.product.name}. You will be refunded.`,
        sellerMsg: `Your item ${trade.productSize.product.name} failed authentication.`,
      },
      [TradeStatus.DELIVERED]: {
        type: NotificationType.TRADE_COMPLETED,
        buyerMsg: `Your ${trade.productSize.product.name} has been delivered!`,
        sellerMsg: `Trade complete for ${trade.productSize.product.name}.`,
      },
    };

    const notification = notificationMap[status];
    if (notification) {
      await prisma.notification.createMany({
        data: [
          {
            userId: trade.buyerId,
            type: notification.type,
            title: `Order ${status.toLowerCase().replace("_", " ")}`,
            message: notification.buyerMsg,
            metadata: { tradeId },
          },
          {
            userId: trade.sellerId,
            type: notification.type,
            title: `Order ${status.toLowerCase().replace("_", " ")}`,
            message: notification.sellerMsg,
            metadata: { tradeId },
          },
        ],
      });
    }

    return NextResponse.json({ trade: updated });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Failed to update trade:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
