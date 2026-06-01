import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/`, { status: 303 });
}

export async function GET() {
  // Allow GET as a fallback (link-based logout); same behaviour.
  return POST();
}
