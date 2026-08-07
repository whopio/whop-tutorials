import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

// The verification's own status. Other Whop objects carry status fields with
// different values, so do not reuse this union for them.
export type VerificationStatus =
  | "not_started"
  | "pending"
  | "processing"
  | "manual_review"
  | "action_required"
  | "approved"
  | "rejected";

export type DemoState = {
  accountId?: string;
  verificationId?: string;
  status?: VerificationStatus;
};

// Everything we keep about one person, in the visitor's own encrypted cookie
// rather than in server memory. A module-level Map does not survive here:
// Vercel runs each request on whichever instance is free, so the request that
// creates the verification and the request that reads it back are usually not
// the same process, and the second one finds an empty Map with nothing to show
// for it. Swap this whole module for a database table.
//
// Route handlers only. A server component importing this file gets its own
// module instance, because Next.js bundles route handlers and server
// components into separate graphs.
async function session(): Promise<IronSession<DemoState>> {
  const env = getEnv();
  return getIronSession<DemoState>(await cookies(), {
    password: env.SESSION_PASSWORD,
    cookieName: "kyc_demo",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.APP_URL.startsWith("https://"),
      path: "/",
    },
  });
}

export async function readState(): Promise<DemoState> {
  return { ...(await session()) };
}

export async function writeState(patch: Partial<DemoState>): Promise<DemoState> {
  const current = await session();
  Object.assign(current, patch);
  await current.save();
  return { ...current };
}

export async function clearState(): Promise<void> {
  (await session()).destroy();
}

// Whop retries a delivery it did not hear back from, so the same event arrives
// more than once. In a real app this is a row with a unique constraint on the
// delivery id. The receiver cannot read a visitor's cookie, so here it keeps
// the last few ids in memory, which is enough to show the shape of the check.
// Returns false when we have seen this id before.
const delivered = new Set<string>();

export function markDelivered(deliveryId: string): boolean {
  if (delivered.has(deliveryId)) return false;
  delivered.add(deliveryId);
  if (delivered.size > 200) {
    delivered.delete(delivered.values().next().value as string);
  }
  return true;
}
