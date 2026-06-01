import type { Metadata } from "next";
import { requireOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OperatorsManager } from "./OperatorsManager";

export const metadata: Metadata = { title: "Operators" };

export default async function OperatorsAdminPage() {
  await requireOperator();

  const operators = await prisma.operator.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, username: true, name: true, avatar: true } },
      addedBy: { select: { username: true } },
    },
  });

  return (
    <div className="mx-auto max-w-[700px] px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="font-sans font-bold text-[28px] sm:text-[32px] text-text-primary">
        Operators
      </h1>
      <p className="mt-2 text-text-secondary">
        Manage who can access Storyline admin tools. Invite by the Whop-registered email — access
        is granted the first time they sign in.
      </p>

      <OperatorsManager
        initial={operators.map((o) => ({
          id: o.id,
          email: o.email,
          isRoot: o.addedByUserId === null,
          linkedUser: o.user
            ? { id: o.user.id, username: o.user.username, name: o.user.name, avatar: o.user.avatar }
            : null,
          addedByUsername: o.addedBy?.username ?? null,
          createdAt: o.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
