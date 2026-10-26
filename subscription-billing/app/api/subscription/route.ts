import { z } from "zod";
import { getSession } from "@/lib/session";
import { ACTIONS, changeSubscription } from "@/lib/subscription";

const bodySchema = z.object({ action: z.enum(ACTIONS) });

// The signed-in subscriber changes their own subscription. Which membership
// comes from the session, so there is no id in the request to tamper with.
export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session.whopUserId) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }

  await changeSubscription(session.whopUserId, parsed.data.action);
  return Response.json({ ok: true });
}
