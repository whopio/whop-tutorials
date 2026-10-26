import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { env } from "@/lib/env";

const formSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const parsed = formSchema.safeParse({ email: form.get("email") });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { email: parsed.data.email },
    update: {},
    create: { email: parsed.data.email },
  });

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  await session.save();

  return NextResponse.redirect(new URL("/", env.NEXT_PUBLIC_APP_URL), {
    status: 303,
  });
}
