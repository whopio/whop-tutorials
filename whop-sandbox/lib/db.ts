import { neon } from "@neondatabase/serverless";
import { getEnv } from "@/lib/env";

// Demo-only persistence: webhook deliveries can't be read back from the
// Whop API, so the live feed stores them in one Neon table. The article's
// reader path verifies webhooks with Vercel logs and the dashboard instead.
export interface WebhookEventRow {
  id: string;
  type: string;
  payload: unknown;
  received_at: string;
}

function sql() {
  const url = getEnv().DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

export async function ensureTable(): Promise<void> {
  await sql()`
    create table if not exists demo_webhook_events (
      id text primary key,
      type text not null,
      payload jsonb not null,
      received_at timestamptz not null default now()
    )
  `;
}

export async function insertEvent(
  id: string,
  type: string,
  payload: unknown,
): Promise<void> {
  const db = sql();
  // Webhook ids double as idempotency keys: replays upsert, not duplicate.
  await db`
    insert into demo_webhook_events (id, type, payload)
    values (${id}, ${type}, ${JSON.stringify(payload)})
    on conflict (id) do nothing
  `;
  // Opportunistic prune keeps the shared feed small.
  await db`delete from demo_webhook_events where received_at < now() - interval '7 days'`;
}

export async function getRecentEvents(limit = 20): Promise<WebhookEventRow[]> {
  const rows = await sql()`
    select id, type, payload, received_at
    from demo_webhook_events
    order by received_at desc
    limit ${limit}
  `;
  return rows as WebhookEventRow[];
}
