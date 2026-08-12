import { getSession } from "@/lib/session";

// Demo-only: clears the session cookie (the held receipt) so visitors can
// replay the walkthrough. The shared webhook feed is untouched by design.
export async function POST() {
  const session = await getSession();
  session.destroy();
  return Response.json({ ok: true });
}
