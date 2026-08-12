import { getEnv } from "@/lib/env";
import { ensureTable, insertEvent } from "@/lib/db";
import { verifyWhopSignature } from "@/lib/verify-whop-signature";

// Demo-only webhook endpoint: it stores each delivery in Neon so step 6 can
// render a live feed (deliveries can't be read back from the API). This
// endpoint was registered via webhooks.create, so it verifies the
// x-whop-signature scheme; the article's route verifies the dashboard's
// Standard Webhooks scheme with whop.webhooks.unwrap instead.
export async function POST(request: Request) {
  const env = getEnv();
  if (!env.WHOP_FEED_WEBHOOK_SECRET || !env.DATABASE_URL) {
    return new Response("Feed not configured", { status: 503 });
  }

  const bodyText = await request.text();
  const ok = verifyWhopSignature(
    bodyText,
    request.headers.get("x-whop-signature"),
    env.WHOP_FEED_WEBHOOK_SECRET,
  );
  if (!ok) {
    return new Response("Invalid signature", { status: 401 });
  }

  const parsed: unknown = JSON.parse(bodyText);
  const event = normalize(parsed);
  if (!event) {
    return new Response("Unrecognized payload", { status: 400 });
  }

  await ensureTable();
  await insertEvent(event.id, event.type, {
    type: event.type,
    data: sanitize(event.data),
  });

  return new Response("OK", { status: 200 });
}

// Deliveries carry { action|type, data } depending on API version; the
// dedup id falls back to type+resource id when no event id is present.
function normalize(
  parsed: unknown,
): { id: string; type: string; data: Record<string, unknown> } | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const type =
    typeof obj.type === "string"
      ? obj.type
      : typeof obj.action === "string"
        ? obj.action
        : null;
  const data =
    obj.data && typeof obj.data === "object"
      ? (obj.data as Record<string, unknown>)
      : {};
  if (!type) return null;
  const eventId =
    typeof obj.id === "string"
      ? obj.id
      : `${type}:${typeof data.id === "string" ? data.id : "unknown"}`;
  return { id: eventId, type, data };
}

// The feed is public, so strip buyer PII before storing; keep the fields
// the panel renders.
function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const keep: Record<string, unknown> = {};
  for (const key of [
    "id",
    "status",
    "substatus",
    "total",
    "subtotal",
    "currency",
    "refunded_amount",
    "paid_at",
    "created_at",
    "amount",
    "final_amount",
    "product_id",
    "plan_id",
    "membership_id",
  ]) {
    if (key in data) keep[key] = data[key];
  }
  const plan = data.plan;
  if (plan && typeof plan === "object" && "id" in plan) {
    keep.plan = { id: (plan as { id: unknown }).id };
  }
  const product = data.product;
  if (product && typeof product === "object" && "id" in product) {
    const p = product as { id: unknown; title?: unknown };
    keep.product = { id: p.id, title: p.title };
  }
  return keep;
}
