import { redirect } from "next/navigation";
import { getSession } from "./session";
import { prisma } from "./prisma";

export async function requireAuth() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    session.destroy();
    redirect("/");
  }

  return user;
}

export async function getOptionalUser() {
  const session = await getSession();
  if (!session.userId) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
  });
}
