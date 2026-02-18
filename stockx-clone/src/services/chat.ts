import { env } from "@/lib/env";

/**
 * Create a short-lived access token for Whop embedded components.
 * Uses the user's OAuth token (not the API key) because the
 * access_tokens endpoint requires user-level authentication.
 */
export async function createAccessToken(oauthToken: string): Promise<string> {
  const res = await fetch(`${env.WHOP_API_BASE}/api/v1/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create access token: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { token: string };
  return data.token;
}

/**
 * Create a DM channel between two users, scoped to our company.
 * Returns the channel ID (format: chat_XXXX). If a channel already
 * exists between these users, Whop returns the existing one.
 *
 * Uses the company API key. Requires `dms:channel:manage` permission
 * on the API key (add it in Whop Dashboard > Settings > API Keys).
 */
export async function createDmChannel(
  buyerWhopId: string,
  sellerWhopId: string,
  tradeName: string
): Promise<string> {
  const res = await fetch(`${env.WHOP_API_BASE}/api/v1/dm_channels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHOP_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      with_user_ids: [buyerWhopId, sellerWhopId],
      company_id: env.WHOP_COMPANY_ID,
      custom_name: tradeName,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create DM channel: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Send a system message in a chat channel.
 * Used for automated trade status updates (e.g. "Payment confirmed!").
 *
 * Uses the company API key. Requires messaging permissions
 * on the API key (add in Whop Dashboard > Settings > API Keys).
 */
export async function sendSystemMessage(
  channelId: string,
  content: string
): Promise<void> {
  const res = await fetch(`${env.WHOP_API_BASE}/api/v1/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHOP_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel_id: channelId, content }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to send system message: ${res.status} ${text}`);
  }
}
