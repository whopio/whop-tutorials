import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";

// Cancels the membership immediately so access revokes right away (the
// gate's checkAccess flips to false on the next render). This is the
// honest way to relock; a refund would leave the membership valid. Needs
// the membership:cancel scope.
export async function POST() {
  const session = await getSession();
  if (!session.membershipId) {
    return Response.json({ error: "no_membership" }, { status: 400 });
  }
  try {
    await getWhop().memberships.cancel(session.membershipId, {
      cancellation_mode: "immediate",
    });
    return Response.json({ ok: true });
  } catch (error: unknown) {
    return Response.json(
      { error: "scope_or_api", detail: String(error) },
      { status: 502 },
    );
  }
}
