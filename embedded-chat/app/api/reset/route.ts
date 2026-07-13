import { NextResponse } from "next/server";
import { getWhop } from "@/lib/whop";
import { channels } from "@/constants/whop-ids";

// Reset the General channel moderation back to open defaults, so the
// moderation demo can be replayed from scratch.
export async function POST(): Promise<Response> {
  try {
    await getWhop().chatChannels.update(channels.general.id, {
      who_can_post: "everyone",
      who_can_react: "everyone",
      ban_media: false,
      ban_urls: false,
      user_posts_cooldown_seconds: 0,
      banned_words: [],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "reset_error", detail: String(error) }, { status: 502 });
  }
}
