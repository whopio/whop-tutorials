/**
 * Parse the `[handle]` dynamic route param into a username. Returns `null` if
 * the handle isn't a valid `@username` form.
 *
 * Defensive against URL encoding: Next.js 16 sometimes passes route params with
 * the `@` URL-encoded as `%40`, depending on how the request entered (RSC
 * navigation vs. fresh load). Decoding once handles both cases.
 */
export function parseHandle(handleParam: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(handleParam);
  } catch {
    decoded = handleParam;
  }
  if (!decoded.startsWith("@")) return null;
  const username = decoded.slice(1).trim();
  if (!username) return null;
  return username;
}
