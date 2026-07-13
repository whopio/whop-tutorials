import { getEnv } from "@/lib/env";
import { getWhop } from "@/lib/whop";
import { CHAT_SCOPES } from "@/lib/scopes";

function apiBase(): string {
  return getEnv().WHOP_SANDBOX
    ? "https://sandbox-api.whop.com/api/v1"
    : "https://api.whop.com/api/v1";
}

type Cached = { token: string; expires: number };
const tokenCache = new Map<string, Cached>();

async function userToken(userId: string): Promise<string> {
  const hit = tokenCache.get(userId);
  const now = Date.now();
  if (hit && hit.expires > now + 60_000) return hit.token;
  const { token, expires_at } = await getWhop().accessTokens.create({
    company_id: getEnv().WHOP_COMPANY_ID,
    user_id: userId,
    scoped_actions: [...CHAT_SCOPES],
  });
  const expires = expires_at ? new Date(expires_at).getTime() : now + 3_600_000;
  tokenCache.set(userId, { token, expires });
  return token;
}

export interface ChatMessage {
  id: string;
  content: string | null;
  created_at: string;
  message_type: string;
  is_pinned: boolean;
  replying_to_message_id: string | null;
  user: { id: string; username: string; name: string | null };
  reaction_counts: Array<{ emoji: string | null; count: number }>;
  poll: { options: Array<{ id: string; text: string }> } | null;
  poll_votes: Array<{ option_id: string | null; count: number }>;
}

export async function fetchMessages(
  channelId: string,
  actingUserId: string,
): Promise<
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; status: number }
> {
  const token = await userToken(actingUserId);
  const res = await fetch(
    `${apiBase()}/messages?channel_id=${encodeURIComponent(channelId)}&first=50`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return { ok: false, status: res.status };
  const data = await res.json();
  const messages = (data?.data ?? []) as ChatMessage[];
  messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return { ok: true, messages };
}

export async function sendMessage(
  channelId: string,
  actingUserId: string,
  content: string,
): Promise<
  | { ok: true; message: ChatMessage }
  | { ok: false; status: number; detail: string }
> {
  const token = await userToken(actingUserId);
  const res = await fetch(`${apiBase()}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel_id: channelId, content }),
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, detail: text };
  return { ok: true, message: JSON.parse(text) as ChatMessage };
}

export async function addReaction(
  messageId: string,
  actingUserId: string,
  emoji: string,
): Promise<{ ok: boolean; status: number }> {
  const token = await userToken(actingUserId);
  const res = await fetch(`${apiBase()}/reactions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ resource_id: messageId, emoji }),
  });
  return { ok: res.ok, status: res.status };
}
