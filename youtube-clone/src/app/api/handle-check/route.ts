import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { handleSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";

/**
 * CHANNEL-2: live @handle availability check for the create-channel form.
 * Gated to signed-in users (only they create a channel). Returns whether the
 * normalized handle is free, or why it isn't (invalid format vs. already taken).
 */
export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ available: false, reason: "auth" }, { status: 401 });
  }

  // This route is called per keystroke and does two DB reads, so cap it per user
  // to blunt loop/abuse against the free-tier DB. Legit debounced typing stays
  // well under this; the client treats a non-OK response as "idle".
  const rl = rateLimit(`handle-check:${user.id}`, 40, 10_000);
  if (!rl.ok) {
    return NextResponse.json(
      { available: false, reason: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const raw = new URL(request.url).searchParams.get("handle") ?? "";
  const parsed = handleSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({
      available: false,
      reason: "invalid",
      message: parsed.error.issues[0]?.message ?? "Invalid handle.",
    });
  }

  const taken = await prisma.channel.findUnique({
    where: { handle: parsed.data },
    select: { id: true },
  });

  return NextResponse.json({
    available: !taken,
    reason: taken ? "taken" : "ok",
    handle: parsed.data,
  });
}
