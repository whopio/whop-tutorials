import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCompanyWhop } from "@/lib/whop";
import { env } from "@/lib/env";

/**
 * Fallback hosted payout portal URL. Surfaced as an "Open in Whop ↗" link on
 * the writer dashboard for any browser that blocks the embedded portal.
 */
export async function GET() {
  const user = await requireAuth({ include: { writerProfile: true } });
  if (!user.writerProfile?.whopCompanyId) {
    return NextResponse.json({ error: "Enable payouts first" }, { status: 400 });
  }

  if (!env.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
    return NextResponse.json(
      {
        error:
          "Whop hosted payout links require NEXT_PUBLIC_APP_URL to be an HTTPS URL. Use the deployed app or an HTTPS tunnel for local sandbox testing.",
      },
      { status: 400 },
    );
  }

  try {
    const link = await getCompanyWhop().accountLinks.create({
      company_id: user.writerProfile.whopCompanyId,
      use_case: "payouts_portal",
      return_url: `${env.NEXT_PUBLIC_APP_URL}/me/dashboard`,
      refresh_url: `${env.NEXT_PUBLIC_APP_URL}/me/dashboard?refresh=true`,
    });
    return NextResponse.json({ url: link.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not generate link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
