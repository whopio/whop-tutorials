import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getEnv } from "@/lib/env";

type VisitorSession = { visitorId?: string };

// One id per browser, kept in its own cookie so it survives a reset of the
// walkthrough. Used to keep each visitor's seller name and email distinct.
export async function getVisitorId(): Promise<string> {
  const env = getEnv();

  const session = await getIronSession<VisitorSession>(await cookies(), {
    password: env.SESSION_PASSWORD,
    cookieName: "kyc_visitor",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.APP_URL.startsWith("https://"),
      path: "/",
    },
  });

  if (!session.visitorId) {
    session.visitorId = randomUUID();
    await session.save();
  }

  return session.visitorId;
}
