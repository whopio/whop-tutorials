import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(new URL("/", env.NEXT_PUBLIC_APP_URL));
}
