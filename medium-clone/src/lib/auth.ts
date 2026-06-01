import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { Prisma } from "@/generated/prisma/client";

export async function getAuthUser<I extends Prisma.UserInclude | undefined = undefined>(
  opts?: { include?: I },
): Promise<Prisma.UserGetPayload<{ include: I }> | null> {
  const session = await getSession();
  if (!session.userId) return null;
  return (await prisma.user.findUnique({
    where: { id: session.userId },
    include: opts?.include,
  })) as Prisma.UserGetPayload<{ include: I }> | null;
}

export async function requireAuth<I extends Prisma.UserInclude | undefined = undefined>(
  opts?: { include?: I },
): Promise<Prisma.UserGetPayload<{ include: I }>> {
  const user = await getAuthUser(opts);
  if (!user) redirect("/api/auth/login");
  return user;
}

export async function requireWriter() {
  const user = await requireAuth({ include: { writerProfile: true } });
  if (!user.writerProfile?.kycComplete) redirect("/me/settings?onboard=true");
  return user;
}

export async function isOperator(userId: string, email?: string | null) {
  // Self-heal: make sure the root operator row exists (and is linked to this user
  // if their email matches) before checking — so the very first admin access works.
  await ensureRootOperator();
  if (email) {
    // Catch users who match a pending Operator invite that hasn't been linked yet
    // (e.g. signed in pre-invite, didn't trigger the OAuth-callback linker).
    await prisma.operator.updateMany({
      where: { email: email.toLowerCase(), userId: null },
      data: { userId },
    });
  }
  const row = await prisma.operator.findFirst({ where: { userId } });
  return Boolean(row);
}

export async function requireOperator() {
  const user = await requireAuth();
  if (!(await isOperator(user.id, user.email))) redirect("/");
  return user;
}

// Idempotent boot-time upsert. Safe to call on every request that touches an admin surface.
export async function ensureRootOperator() {
  const email = (process.env.ROOT_OPERATOR_EMAIL || "").toLowerCase();
  if (!email) return;
  const matchingUser = await prisma.user.findUnique({ where: { email } });
  await prisma.operator.upsert({
    where: { email },
    create: { email, userId: matchingUser?.id ?? null, addedByUserId: null },
    update: { userId: matchingUser?.id ?? null },
  });
}
