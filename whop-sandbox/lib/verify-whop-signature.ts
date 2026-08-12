import { createHmac, timingSafeEqual } from "node:crypto";

// Verifies the `x-whop-signature: t=<unix>,v1=<hex>` scheme that
// API-created Whop webhooks deliver: HMAC-SHA256 over "<t>.<body>" keyed
// with the raw webhook secret. Dashboard-created webhooks use the Standard
// Webhooks spec instead and are verified with whop.webhooks.unwrap; the
// article teaches that path.
const TOLERANCE_SECONDS = 5 * 60;

export function verifyWhopSignature(
  bodyText: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const tMatch = /t=(\d+)/.exec(signatureHeader);
  const vMatch = /v1=([a-f0-9]{64})/.exec(signatureHeader);
  if (!tMatch || !vMatch) return false;

  const timestamp = Number(tMatch[1]);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${tMatch[1]}.${bodyText}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(vMatch[1], "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
