import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { env } from "@/lib/env";

export async function POST() {
  const session = await getSession();
  session.destroy();

  return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/`);
}
