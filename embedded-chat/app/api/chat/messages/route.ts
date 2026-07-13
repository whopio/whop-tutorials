import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchMessages, sendMessage } from "@/lib/chat";
import { isKnownUser } from "@/constants/whop-ids";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const channelId = url.searchParams.get("channelId") ?? "";
  const userId = url.searchParams.get("userId") ?? "";
  if (!channelId || !isKnownUser(userId)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const result = await fetchMessages(channelId, userId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.status === 403 ? "no_access" : "read_error" },
      { status: result.status === 403 ? 403 : 502 },
    );
  }
  return NextResponse.json({ messages: result.messages });
}

const postSchema = z.object({
  channelId: z.string().min(1),
  userId: z.string().startsWith("user_"),
  content: z.string().min(1).max(2000),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { channelId, userId, content } = parsed.data;
  if (!isKnownUser(userId)) {
    return NextResponse.json({ error: "unknown_user" }, { status: 403 });
  }
  const result = await sendMessage(channelId, userId, content);
  if (!result.ok) {
    const notAllowed = result.status === 403 || result.status === 400;
    return NextResponse.json(
      { error: notAllowed ? "not_allowed" : "send_error", detail: result.detail },
      { status: notAllowed ? 403 : 502 },
    );
  }
  return NextResponse.json({ message: result.message });
}
