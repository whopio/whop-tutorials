// Client-safe view of public env vars. Next.js inlines `process.env.NEXT_PUBLIC_*`
// references at build time, so these end up baked into the client bundle.
export const env = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  NEXT_PUBLIC_WHOP_SANDBOX: process.env.NEXT_PUBLIC_WHOP_SANDBOX ?? "",
};
