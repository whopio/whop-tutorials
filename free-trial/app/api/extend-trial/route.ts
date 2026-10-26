import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";

// Pushes the trial end / first-charge date back 3 days. For a recurring
// trial this extends the trial; for an expiration-based membership it
// extends the expiration date. Needs the member:manage permission.
// Demo-only: the try/catch hands the error text to the status panel,
// which turns a missing permission into a hint.
export async function POST() {
  const session = await getSession();
  if (!session.membershipId) {
    return Response.json({ error: "no_membership" }, { status: 400 });
  }

  try {
    const membership = await getWhop().memberships.extend({
      id: session.membershipId,
      days: 3,
    });

    return Response.json({
      ok: true,
      renewalPeriodEnd: membership.current_period_end,
    });
  } catch (error: unknown) {
    return Response.json(
      { error: "scope_or_api", detail: String(error) },
      { status: 502 },
    );
  }
}
