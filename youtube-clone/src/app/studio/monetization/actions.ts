"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { whopCompany } from "@/lib/whop";
import { isSandbox } from "@/lib/env";

/**
 * PAYOUTS-1 (the deferred CHANNEL-1 enrollment): create a Whop connected
 * account for this channel. The platform's API key makes it a child of our
 * platform account (there's no parent field), so the
 * creator can be charged as merchant of record and withdraw their earnings.
 * Idempotent — once `whopCompanyId` is set we never re-create it.
 */
export async function enableMonetization(): Promise<
  { ok: true } | { error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const channel = await prisma.channel.findUnique({
    where: { userId: user.id },
    select: { id: true, name: true, handle: true, whopCompanyId: true },
  });
  if (!channel) return { error: "Create a channel first." };
  if (channel.whopCompanyId) return { ok: true };

  try {
    const company = await whopCompany.accounts.create({
      title: channel.name,
      email: user.email ?? `${channel.handle}@wavora.app`,
      metadata: { channelId: channel.id, handle: channel.handle },
    });

    await prisma.channel.update({
      where: { id: channel.id },
      data: {
        whopCompanyId: company.id,
        // Sandbox skips KYC, so the account is immediately payout-ready. In
        // production this stays false until KYC clears (PAYOUTS-6).
        payoutEnabled: isSandbox(),
        // Cheers is available once the creator has a connected account.
        superThanksEnabled: true,
      },
    });
  } catch (err) {
    console.error("accounts.create failed:", err);
    return { error: "Could not enable monetization. Please try again." };
  }

  revalidatePath("/studio/monetization");
  return { ok: true };
}
