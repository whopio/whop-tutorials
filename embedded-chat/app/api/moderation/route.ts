import { NextResponse } from "next/server";
import { z } from "zod";
import { getWhop } from "@/lib/whop";
import { channels } from "@/constants/whop-ids";

// Live moderation of the General channel via the company key (chat:moderate).
// GET reads current settings; POST applies a change.
type ChannelSettings = {
  who_can_post: string;
  who_can_react: string;
  ban_media: boolean;
  ban_urls: boolean;
  user_posts_cooldown_seconds: number | null;
  banned_words: string[];
};

function pick(ch: Record<string, unknown>): ChannelSettings {
  return {
    who_can_post: (ch.who_can_post as string) ?? "everyone",
    who_can_react: (ch.who_can_react as string) ?? "everyone",
    ban_media: Boolean(ch.ban_media),
    ban_urls: Boolean(ch.ban_urls),
    user_posts_cooldown_seconds: (ch.user_posts_cooldown_seconds as number | null) ?? 0,
    banned_words: (ch.banned_words as string[]) ?? [],
  };
}

const schema = z.object({
  who_can_post: z.enum(["everyone", "admins"]).optional(),
  who_can_react: z.enum(["everyone", "no_one"]).optional(),
  ban_media: z.boolean().optional(),
  ban_urls: z.boolean().optional(),
  user_posts_cooldown_seconds: z.number().int().min(0).max(300).optional(),
  banned_words: z.array(z.string()).optional(),
});

export async function GET(): Promise<Response> {
  try {
    const ch = await getWhop().chatChannels.retrieve(channels.general.id);
    return NextResponse.json(pick(ch as unknown as Record<string, unknown>));
  } catch (error) {
    return NextResponse.json({ error: "read_error", detail: String(error) }, { status: 502 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const ch = await getWhop().chatChannels.update(channels.general.id, parsed.data);
    return NextResponse.json(pick(ch as unknown as Record<string, unknown>));
  } catch (error) {
    return NextResponse.json({ error: "moderation_error", detail: String(error) }, { status: 502 });
  }
}
