import { redirect } from "next/navigation";
import { getSession } from "./session";
import { prisma } from "./prisma";

interface AuthUser {
  id: string;
  whopUserId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export async function requireAuth(
  options?: { redirect?: boolean }
): Promise<AuthUser | null> {
  const session = await getSession();

  if (!session.userId) {
    if (options?.redirect === false) return null;
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    session.destroy();
    if (options?.redirect === false) return null;
    redirect("/sign-in");
  }

  return user;
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session.userId;
}

export async function getCreatorProfile(userId: string) {
  return prisma.creatorProfile.findUnique({
    where: { userId },
  });
}
