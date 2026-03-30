import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();

  if (!session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Return the user's OAuth token — the chat SDK needs user identity
  // for real-time messaging via websocket
  return NextResponse.json({ token: session.accessToken });
}
