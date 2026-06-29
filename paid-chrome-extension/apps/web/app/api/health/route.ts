import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "whop-extension-template-web",
    timestamp: new Date().toISOString()
  });
}
