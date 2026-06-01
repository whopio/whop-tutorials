// Lazy getter — see note in lib/whop.ts about ESM import hoisting vs dotenv.
export function getWhopOauthBaseUrl(): string {
  return process.env.WHOP_SANDBOX === "true"
    ? "https://sandbox-api.whop.com"
    : "https://api.whop.com";
}

// Back-compat: keep the constant export. Routes that import this run at request
// time, by which point Next.js has loaded env vars, so the module-load read is
// safe for them. New code should prefer `getWhopOauthBaseUrl()`.
export const whopOauthBaseUrl =
  process.env.WHOP_SANDBOX === "true"
    ? "https://sandbox-api.whop.com"
    : "https://api.whop.com";

export function base64url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

export function randomString(len: number) {
  return base64url(crypto.getRandomValues(new Uint8Array(len)));
}

export async function sha256(s: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return base64url(new Uint8Array(digest));
}
