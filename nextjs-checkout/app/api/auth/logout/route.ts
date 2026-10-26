import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { env } from "@/lib/env";

export async function POST(_request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(new URL("/", env.NEXT_PUBLIC_APP_URL), {
    status: 303,
  });
}
