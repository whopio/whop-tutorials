import { redirect } from "next/navigation";
import { getSession } from "./session";
import { prisma } from "./prisma";

/**
 * Returns the authenticated user or redirects to login.
 * Pass { redirect: false } to return null instead (for API routes).
 */
export async function requireAuth(
  options?: { redirect?: boolean }
): Promise<{
  id: string;
  whopUserId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
} | null> {
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

/**
 * Check if the current session is authenticated without a DB lookup.
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session.userId;
}
