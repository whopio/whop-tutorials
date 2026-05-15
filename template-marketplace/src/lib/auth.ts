import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSession } from "./session";

export async function requireAuth() {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in");
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/sign-in");
  return user;
}

export async function isAuthenticated() {
  const session = await getSession();
  if (!session.userId) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function requireSeller() {
  const user = await requireAuth();
  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: user.id },
  });
  if (!seller) redirect("/sell");
  return { user, seller };
}

export async function getSellerProfile(userId: string) {
  return prisma.sellerProfile.findUnique({ where: { userId } });
}
