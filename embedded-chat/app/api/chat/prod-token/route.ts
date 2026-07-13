import { NextResponse } from "next/server";
import { z } from "zod";
import { getProdEnv } from "@/lib/prod-env";
import { getWhopProd } from "@/lib/whop-prod";
import { isKnownUser } from "@/constants/whop-ids.prod";

const bodySchema = z.object({ userId: z.string().startsWith("user_") });

// The embed surface only reads and posts in one public channel, so this
// anonymously mintable production token carries only those two scopes,
// not the full DM/support set the sandbox demo uses.
const EMBED_SCOPES = ["chat:read", "chat:message:create"];

// Mint a short-lived, company-scoped chat token for one production demo user.
// The live <ChatElement> calls this to authenticate and to refresh. Same shape
// as /api/chat/token, but backed by the production company + key.
export async function POST(request: Request): Promise<Response> {
  if (!getProdEnv().configured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { userId } = parsed.data;
  // Only the provisioned demo users can be acted as; nobody can mint a token
  // for an arbitrary production account.
  if (!isKnownUser(userId)) {
    return NextResponse.json({ error: "unknown_user" }, { status: 403 });
  }

  try {
    const { token } = await getWhopProd().accessTokens.create({
      company_id: getProdEnv().companyId,
      user_id: userId,
      scoped_actions: EMBED_SCOPES,
    });
    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json(
      { error: "token_error", detail: String(error) },
      { status: 502 },
    );
  }
}
