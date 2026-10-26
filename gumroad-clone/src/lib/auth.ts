import { redirect } from "next/navigation";
import { getSession } from "./session";
import { prisma } from "./prisma";
import { getCompanyWhop } from "./whop";

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

export async function completeKycIfNeeded(userId: string): Promise<boolean> {
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId },
  });
  if (!profile || profile.kycComplete) return !!profile?.kycComplete;

  // Landing on the KYC return URL doesn't prove the seller finished verification,
  // so we ask Whop whether the connected account's identity check is approved.
  const account = await getCompanyWhop().accounts.retrieve({
    id: profile.whopCompanyId,
  });
  const { individual, business } = account.verification as {
    individual?: { status?: string } | null;
    business?: { status?: string } | null;
  };
  if (individual?.status !== "approved" && business?.status !== "approved") {
    return false;
  }

  await prisma.sellerProfile.update({
    where: { id: profile.id },
    data: { kycComplete: true },
  });
  return true;
}
