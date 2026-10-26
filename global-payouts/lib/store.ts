import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

// The payout status words. in_transit is no longer one of them, it became a
// detail under processing.
export type PaymentStatus =
  | "requested"
  | "in_review"
  | "processing"
  | "completed"
  | "reversed"
  | "canceled"
  | "failed"
  | "denied";

export type DemoState = {
  sellerId?: string;
  sellerTitle?: string;
  sellerCountry?: string;
  fundedAmount?: number;
  payoutMethodId?: string;
  payoutMethodLabel?: string;
  paymentRecordId?: string;
  withdrawalId?: string;
  status?: PaymentStatus;
  feeAmount?: number;
  amount?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  platformCoversFees?: boolean;
};

// State lives in the visitor's own encrypted cookie rather than in server
// memory. A module-level Map does not survive here: Vercel runs each request on
// whichever instance is free, so the request that creates the seller and the
// request that asks for a token are usually not the same process, and the
// second one reads an empty Map. Nothing errors, the read just comes back
// missing.
//
// Route handlers only. A server component that imported this file would get its
// own module instance, because Next.js bundles route handlers and server
// components into separate graphs.
async function session(): Promise<IronSession<DemoState>> {
  const env = getEnv();
  return getIronSession<DemoState>(await cookies(), {
    password: env.SESSION_PASSWORD,
    cookieName: "payouts_demo",
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
