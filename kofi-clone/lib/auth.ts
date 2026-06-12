import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { prisma } from "./prisma";
import { sessionOptions, type SessionData } from "./session";
import type { Creator, User } from "@prisma/client";

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export type CurrentUser = User & { creator: Creator | null };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { creator: true },
  });
  return user;
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  return user;
}

export async function requireCreator(): Promise<CurrentUser & { creator: Creator }> {
  const user = await requireAuth();
  if (!user.creator) redirect("/dashboard/start");
  return user as CurrentUser & { creator: Creator };
}
