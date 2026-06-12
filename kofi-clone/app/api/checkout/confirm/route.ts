import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop";
import { fulfillFromMetadata } from "@/lib/fulfillment";

const schema = z.object({ ref: z.string().min(1), creatorUsername: z.string().min(1) });

/**
 * Checkout-return confirmation: verify with Whop that a payment carrying this `ref`
 * actually succeeded, then fulfill. Local-dev fallback when webhooks can't reach
 * localhost; in production the webhook is the source of truth.
 */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const creator = await prisma.creator.findUnique({
    where: { username: parsed.data.creatorUsername },
    select: { whopCompanyId: true },
  });
  if (!creator?.whopCompanyId) return NextResponse.json({ ok: false }, { status: 400 });

  let matched: { id: string; metadata?: Record<string, unknown> | null } | null = null;
  try {
    let scanned = 0;
    for await (const payment of whopsdk.payments.list({ company_id: creator.whopCompanyId, direction: "desc" })) {
      const p = payment as unknown as {
        id: string;
        status?: string;
        substatus?: string;
        metadata?: Record<string, unknown> | null;
      };
      // Whop payment `status` is a ReceiptStatus ("paid" when it settles); the
      // friendly "succeeded" lives on `substatus`. Accept either.
      const settled = p.status === "paid" || p.substatus === "succeeded";
      if (p.metadata?.ref === parsed.data.ref && settled) {
        matched = { id: p.id, metadata: p.metadata };
        break;
      }
      if (++scanned >= 40) break;
    }
  } catch (err: unknown) {
    console.error("payments.list failed during confirm:", err);
  }

  if (!matched) return NextResponse.json({ ok: false, pending: true });

  await fulfillFromMetadata(matched.metadata, matched.id);
  return NextResponse.json({ ok: true });
}
