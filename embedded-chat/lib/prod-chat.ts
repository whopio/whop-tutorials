import { getProdEnv } from "@/lib/prod-env";
import { getWhopProd } from "@/lib/whop-prod";
import { CHAT_SCOPES } from "@/lib/scopes";

// Server-side helpers for the production Chat API, used to seed and reset the
// live demo channel. Parallels lib/chat.ts, but against the production company.
const BASE = "https://api.whop.com/api/v1";

type Cached = { token: string; expires: number };
const tokenCache = new Map<string, Cached>();

async function prodUserToken(userId: string): Promise<string> {
  const hit = tokenCache.get(userId);
  const now = Date.now();
  if (hit && hit.expires > now + 60_000) return hit.token;
  const { token, expires_at } = await getWhopProd().accessTokens.create({
    company_id: getProdEnv().companyId,
    user_id: userId,
    scoped_actions: [...CHAT_SCOPES],
  });
  const expires = expires_at ? new Date(expires_at).getTime() : now + 3_600_000;
  tokenCache.set(userId, { token, expires });
  return token;
}

export type ProdMsg = {
  id: string;
  content: string | null;
  created_at: string;
  user?: { id: string; username: string; name: string | null };
};

export async function prodListMessages(
  channelId: string,
  readerId: string,
  first = 50,
): Promise<ProdMsg[]> {
  const token = await prodUserToken(readerId);
  const res = await fetch(
    `${BASE}/messages?channel_id=${encodeURIComponent(channelId)}&first=${first}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return [];
  const data = await res.json();
  const msgs = (data?.data ?? []) as ProdMsg[];
  msgs.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return msgs;
}

export async function prodPost(
  channelId: string,
  userId: string,
  content: string,
  extra: Record<string, unknown> = {},
): Promise<ProdMsg | null> {
  const token = await prodUserToken(userId);
  const res = await fetch(`${BASE}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel_id: channelId, content, ...extra }),
  });
  if (!res.ok) return null;
  return (await res.json()) as ProdMsg;
}

export async function prodReact(
  userId: string,
  resourceId: string,
  pollOptionId: string,
): Promise<void> {
  const token = await prodUserToken(userId);
  await fetch(`${BASE}/reactions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ resource_id: resourceId, poll_option_id: pollOptionId }),
  }).catch(() => {});
}

// Delete every message in the channel, as a channel admin (the owner). Falls
// back to the SDK's company-key delete if the admin-token DELETE is refused.
export async function prodWipe(channelId: string, adminUserId: string): Promise<number> {
  const token = await prodUserToken(adminUserId);
  let deleted = 0;
  for (let round = 0; round < 20; round++) {
    const res = await fetch(
      `${BASE}/messages?channel_id=${encodeURIComponent(channelId)}&first=50`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) break;
    const msgs = ((await res.json())?.data ?? []) as ProdMsg[];
    if (!msgs.length) break;
    let any = false;
    for (const m of msgs) {
      const del = await fetch(`${BASE}/messages/${encodeURIComponent(m.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (del.ok) {
        deleted++;
        any = true;
        continue;
      }
      try {
        await getWhopProd().messages.delete(m.id);
        deleted++;
        any = true;
      } catch {
        /* leave it; the loop breaks below if a whole page is undeletable */
      }
    }
    if (!any) break;
  }
  return deleted;
}

export async function prodModerate(
  channelId: string,
  settings: Record<string, unknown>,
): Promise<void> {
  await getWhopProd().chatChannels.update(channelId, settings as never);
}
