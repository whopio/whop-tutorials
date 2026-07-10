import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-config";

function destroy(url: string) {
  const res = NextResponse.redirect(new URL("/", new URL(url).origin));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export async function POST(request: Request) {
  return destroy(request.url);
}

export async function GET(request: Request) {
  return destroy(request.url);
}
