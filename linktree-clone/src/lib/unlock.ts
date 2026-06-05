import { createHmac, timingSafeEqual } from "crypto";

// A paid unlock is proved with a signed, httpOnly cookie rather than a value in
// the URL. The buyer's browser receives `unlock_<creatorId>` after a verified
// payment; the public profile page reads it server-side. Because it is httpOnly
// and never appears in a shareable link, one buyer's access cannot be copied
// from a URL and handed to someone who did not pay.

export function unlockCookieName(creatorId: string): string {
  return `unlock_${creatorId}`;
}

function sign(unlockId: string): string {
  const secret = process.env.SESSION_SECRET ?? "";
  return createHmac("sha256", secret).update(unlockId).digest("base64url");
}

// token shape: "<unlockId>.<hmac>"
export function signUnlock(unlockId: string): string {
  return `${unlockId}.${sign(unlockId)}`;
}

// Returns the unlockId if the token is well-formed and the signature matches,
// otherwise null. The caller still confirms the unlock is PAID and belongs to
// the creator before granting access.
export function verifyUnlock(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const unlockId = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  const expected = sign(unlockId);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return unlockId;
}
