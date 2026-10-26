import { whop } from "@/lib/whop";
import type { VerificationStatus } from "@/lib/store";

const REASONS: Record<VerificationStatus, string> = {
  not_started: "We need to confirm who you are before we can send you money.",
  pending: "Finish the identity check we opened for you.",
  processing: "We are checking the details you sent. There is nothing to do right now.",
  manual_review: "A person is reviewing your details. This usually takes up to 3 business days.",
  action_required: "We need one more thing from you before payouts can start.",
  rejected: "We could not confirm your identity. Contact support to try again.",
  approved: "Your identity is confirmed, so payouts can start.",
};

export async function canReceivePayouts(
  accountId: string,
): Promise<{ allowed: boolean; reason: string }> {
  const { data } = await whop().verifications.list({ account_id: accountId });
  const individual = data?.find((verification) => verification.kind === "individual");
  const status = individual?.status ?? "not_started";

  if (status !== "approved") {
    return { allowed: false, reason: REASONS[status] };
  }

  if ((individual?.requested_information ?? []).length > 0) {
    return { allowed: false, reason: REASONS.action_required };
  }

  return { allowed: true, reason: REASONS.approved };
}
