import { NextResponse } from "next/server";
import { getProdEnv } from "@/lib/prod-env";
import {
  prodListMessages,
  prodPost,
  prodReact,
  prodWipe,
  prodModerate,
} from "@/lib/prod-chat";
import {
  provisioned,
  channel,
  ownerUserId,
  demoUsers,
} from "@/constants/whop-ids.prod";

// Keep the public, writable demo channel fresh. The live section pings this on
// load and it resets only when the channel is stale; a call carrying
// RESET_SECRET forces a reset regardless.

const QUIET_MS = 15 * 60_000; // visitor posts reset once the room is quiet this long
const SEED_SPAN_MS = 90_000; // messages this close together are just the seed
const HARD_MS = 24 * 60 * 60_000; // refresh even an untouched channel daily
const MAX_MESSAGES = 50; // reset immediately after a big burst
const DEBOUNCE_MS = 60_000; // per instance, never check twice within a minute

// Same heavy moderation the provisioner applies, re-asserted after each reset.
const BANNED_WORDS = [
  "fuck", "shit", "bitch", "cunt", "asshole", "dick", "piss", "bastard",
  "nigger", "nigga", "faggot", "fag", "retard", "spic", "chink", "kike", "tranny",
  "whore", "slut", "rape", "kys",
  "onlyfans", "porn", "nudes", "crypto pump", "free money", "click here", "airdrop",
];
const MODERATION = {
  who_can_post: "everyone",
  who_can_react: "everyone",
  ban_urls: true,
  ban_media: true,
  user_posts_cooldown_seconds: 5,
  banned_words: BANNED_WORDS,
};

let lastRun = 0;

function byKey(key: string): string | null {
  return demoUsers.find((u) => u.key === key)?.userId ?? null;
}

async function reseed(): Promise<void> {
  const ava = byKey("ava");
  const ben = byKey("ben");
  const cara = byKey("cara");
  if (!ava || !ben || !cara) return;

  try {
    // Slow mode off during the seed so back-to-back posts are not throttled.
    await prodModerate(channel.id, { user_posts_cooldown_seconds: 0 });
    await prodWipe(channel.id, ownerUserId);

    await prodPost(channel.id, ava, "Hey everyone, welcome to Orbit! 👋");
    await prodPost(channel.id, ben, "Heads up: this is the real Whop chat element, live on production.");
    const poll = await prodPost(channel.id, cara, "What should we ship next?", {
      poll: {
        options: [
          { id: "1", text: "Weekly office hours" },
          { id: "2", text: "A show-and-tell thread" },
        ],
      },
    });
    await prodPost(
      channel.id,
      ava,
      "Switch profiles below and send a message, it posts for real. Replies, reactions and real-time updates all work in here.",
    );
    if (poll?.id) {
      await prodReact(ava, poll.id, "1");
      await prodReact(ben, poll.id, "2");
    }
  } finally {
    // Never leave the public channel unmoderated, even if seeding failed.
    await prodModerate(channel.id, MODERATION).catch(() => {});
  }
}

// Stale means a visitor has posted and the room has since gone quiet, the
// channel is empty or overflowing, or a full day has passed. A pristine seed
// (all messages within seconds of each other) is left alone, so idle visitors
// never trigger pointless wipes.
function isStale(msgs: { created_at: string }[], now: number): boolean {
  if (msgs.length === 0) return true;
  if (msgs.length > MAX_MESSAGES) return true;
  const oldest = new Date(msgs[0].created_at).getTime();
  const newest = new Date(msgs[msgs.length - 1].created_at).getTime();
  if (now - oldest > HARD_MS) return true;
  if (newest - oldest < SEED_SPAN_MS) return false;
  return now - newest > QUIET_MS;
}

export async function POST(request: Request): Promise<Response> {
  if (!getProdEnv().configured || !provisioned) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const now = Date.now();
  if (now - lastRun < DEBOUNCE_MS) {
    return NextResponse.json({ ok: true, reset: false, reason: "debounced" });
  }
  // Claim the slot before any await so a concurrent burst on this instance
  // collapses to one check. The debounce is per serverless instance; the
  // staleness gate below is what bounds cross-instance work.
  lastRun = now;

  const secret = getProdEnv().resetSecret;
  const auth = request.headers.get("authorization");
  const forced =
    !!secret &&
    (request.headers.get("x-reset-secret") === secret ||
      auth === `Bearer ${secret}`);

  try {
    let stale = true;
    if (!forced) {
      const msgs = await prodListMessages(channel.id, ownerUserId, MAX_MESSAGES + 1);
      stale = isStale(msgs, now);
    }
    if (!forced && !stale) {
      return NextResponse.json({ ok: true, reset: false });
    }
    await reseed();
    return NextResponse.json({ ok: true, reset: true, forced });
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: "reset_error", detail: String(error) },
      { status: 502 },
    );
  }
}
