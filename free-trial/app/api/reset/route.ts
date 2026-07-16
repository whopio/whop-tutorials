import { getSession } from "@/lib/session";

// Demo-only: clears the session cookie so visitors can replay the
// paywall. Whop still remembers the purchase; signing in restores it.
export async function POST() {
  const session = await getSession();
  session.destroy();
  return Response.json({ ok: true });
}
