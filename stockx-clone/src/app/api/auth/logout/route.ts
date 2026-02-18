import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { type SessionData, sessionOptions } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );
  session.destroy();

  return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL!, {
    status: 302,
  });
}
