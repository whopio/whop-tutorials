import { getEnv } from "@/lib/env";
import { getRecentEvents } from "@/lib/db";

// Step 6 polls this for the live webhook feed. The feed is shared across
// visitors by design: it is a feed of the sandbox company's events.
export async function GET() {
  if (!getEnv().DATABASE_URL) {
    return Response.json({ events: [], disabled: true });
  }
  const events = await getRecentEvents(20);
  return Response.json({
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      receivedAt: e.received_at,
      summary: summarize(e.type, e.payload),
    })),
  });
}

function summarize(type: string, payload: unknown): string {
  const data =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data: Record<string, unknown> }).data
      : null;
  if (!data) return "";
  const parts: string[] = [];
  if (typeof data.id === "string") parts.push(data.id);
  const total =
    typeof data.final_amount === "number"
      ? data.final_amount
      : typeof data.total === "number"
        ? data.total
        : typeof data.subtotal === "number"
          ? data.subtotal
          : typeof data.amount === "number"
            ? data.amount
            : null;
  if (total !== null) parts.push(`$${total}`);
  const status = typeof data.status === "string" ? data.status : null;
  if (status) parts.push(status);
  return parts.join(" · ");
}
