import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";

// Pushes the trial end / first-charge date back 3 days. For a recurring
// trial this extends the Stripe trial; for an expiration-based membership
// it extends the expiration date. Needs the member:manage scope.
export async function POST() {
  const session = await getSession();
  if (!session.membershipId) {
    return Response.json({ error: "no_membership" }, { status: 400 });
  }
  try {
    const membership = await getWhop().memberships.addFreeDays(
      session.membershipId,
      { free_days: 3 },
    );
    return Response.json({
      ok: true,
      renewalPeriodEnd: membership.renewal_period_end,
    });
  } catch (error: unknown) {
    return Response.json(
      { error: "scope_or_api", detail: String(error) },
      { status: 502 },
    );
  }
}
