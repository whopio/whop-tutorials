import { redirect } from "next/navigation";
import { getSession } from "./session";
import { prisma } from "./prisma";

export async function getAuthUser() {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { sellerProfile: true },
  });

  return user;
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireSeller() {
  const user = await requireAuth();
  if (!user.sellerProfile) redirect("/sell");
  if (!user.sellerProfile.kycComplete) redirect("/sell?kyc=incomplete");
  return { user, sellerProfile: user.sellerProfile };
}

/**
 * Complete KYC for a seller whose profile exists but kycComplete is false.
 * Called from the sell dashboard when the seller returns from Whop's KYC flow.
 */
export async function completeKycIfNeeded(userId: string): Promise<boolean> {
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId },
  });
  if (!profile || profile.kycComplete) return !!profile?.kycComplete;

  await prisma.sellerProfile.update({
    where: { id: profile.id },
    data: { kycComplete: true },
  });
  return true;
}
