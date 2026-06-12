import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

async function destroy(req: NextRequest) {
  // Clear the session through the next/headers cookie store (via getSession).
  // iron-session's (req, res) overload does not reliably emit Set-Cookie on a
  // NextResponse redirect in production, so destroying via cookies() is what
  // actually logs the user out.
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(new URL("/", req.nextUrl.origin));
}

export async function GET(req: NextRequest) {
  return destroy(req);
}

export async function POST(req: NextRequest) {
  return destroy(req);
}
