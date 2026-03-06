import { redirect } from "next/navigation";
import { getSession } from "./session";
import { prisma } from "./prisma";

/**
 * Single auth function. Call from any server component or API route.
 * Returns the authenticated user or redirects to login.
 *
 * Usage:
 *   const user = await requireAuth();            // redirects if not logged in
 *   const user = await requireAuth({ redirect: false }); // returns null instead
 */
export async function requireAuth(
  options?: { redirect?: boolean }
): Promise<{
  id: string;
  whopUserId: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
} | null> {
  const session = await getSession();

  if (!session.userId) {
    if (options?.redirect === false) return null;
    redirect("/api/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    // Session references a deleted user — clear and redirect
    session.destroy();
    if (options?.redirect === false) return null;
    redirect("/api/auth/login");
  }

  return user;
}

/**
 * Look up the Writer profile for a given userId.
 * Returns null if the user has not completed onboarding.
 */
export async function getWriterProfile(userId: string) {
  return prisma.writer.findUnique({ where: { userId } });
}

/**
 * Check if the current session is authenticated without fetching user data.
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session.userId;
}
