import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL!));
}
