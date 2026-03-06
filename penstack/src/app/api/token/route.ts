import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await getSession();

  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`token:${session.userId}`, {
    interval: 60_000,
    maxRequests: 30,
  });
  if (limited) return limited;

  return NextResponse.json({ accessToken: session.accessToken ?? null });
}
