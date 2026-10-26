import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getSession } from "@/lib/session";

export async function POST(): Promise<NextResponse> {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(`${getEnv().APP_URL}/`, { status: 303 });
}
