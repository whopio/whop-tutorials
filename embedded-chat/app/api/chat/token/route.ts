import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { getWhop } from "@/lib/whop";
import { CHAT_SCOPES } from "@/lib/scopes";
import { isKnownUser } from "@/constants/whop-ids";

const bodySchema = z.object({ userId: z.string().startsWith("user_") });

export async function POST(request: Request): Promise<Response> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { userId } = parsed.data;
  if (!isKnownUser(userId)) {
    return NextResponse.json({ error: "unknown_user" }, { status: 403 });
  }

  try {
    const { token } = await getWhop().accessTokens.create({
      company_id: getEnv().WHOP_COMPANY_ID,
      user_id: userId,
      scoped_actions: [...CHAT_SCOPES],
    });
    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json(
      { error: "token_error", detail: String(error) },
      { status: 502 },
    );
  }
}
