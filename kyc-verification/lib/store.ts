import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

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

const delivered = new Set<string>();

export function markDelivered(deliveryId: string): boolean {
  if (delivered.has(deliveryId)) return false;
  delivered.add(deliveryId);
  if (delivered.size > 200) {
    delivered.delete(delivered.values().next().value as string);
  }
  return true;
}
