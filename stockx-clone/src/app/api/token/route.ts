import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAccessToken } from "@/services/chat";

/**
 * GET /api/token
 * Returns a short-lived Whop access token for the current user.
 * Used by the ChatSession component to authenticate embedded chat.
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session.accessToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = await createAccessToken(session.accessToken);
    return NextResponse.json({ token });
  } catch (error: unknown) {
    console.error("Token creation error:", error);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}
