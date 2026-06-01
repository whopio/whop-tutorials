import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const InviteSchema = z.object({ email: z.string().email() });

export async function GET() {
  await requireOperator();
  const operators = await prisma.operator.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, username: true, name: true, avatar: true } },
      addedBy: { select: { username: true } },
    },
  });
  return NextResponse.json({
    operators: operators.map((o) => ({
      id: o.id,
      email: o.email,
      isRoot: o.addedByUserId === null,
      linkedUser: o.user
        ? { id: o.user.id, username: o.user.username, name: o.user.name, avatar: o.user.avatar }
        : null,
      addedByUsername: o.addedBy?.username ?? null,
      createdAt: o.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const me = await requireOperator();
  const parsed = InviteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.operator.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Already an operator", id: existing.id }, { status: 409 });
  }

  // Link immediately if a User with this email already exists.
  const matchingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  const op = await prisma.operator.create({
    data: {
      email,
      userId: matchingUser?.id ?? null,
      addedByUserId: me.id,
    },
  });

  return NextResponse.json({ id: op.id, pending: !matchingUser });
}
