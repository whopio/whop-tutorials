import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { appUrl } from "@/lib/whop";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(
    `${appUrl}/`,
    { status: 303 },
  );
}
