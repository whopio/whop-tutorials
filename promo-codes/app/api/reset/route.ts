import { getSession } from "@/lib/session";
import { reactivateSeededCodes } from "@/lib/promo";

// Demo-only. Nothing here was created at runtime, so there is nothing to tidy
// away: a reset just forgets this visitor's receipt and puts any code someone
// paused back to active, so the next person starts from the same place.
export async function POST() {
  const resumed = await reactivateSeededCodes();
  const session = await getSession();
  session.destroy();
  return Response.json({ ok: true, resumed });
}
