import { NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { readState } from "@/lib/store";
import { compareRails, formatRail } from "@/lib/quotes";
import { DEMO_PAYOUT_AMOUNT } from "@/constants/whop-ids";

type BlockedReason = {
  title: string;
  description: string;
  blockedCapabilities: string[];
};

export async function GET(request: Request) {
  const state = await readState();

  if (!state.sellerId) {
    return NextResponse.json({ error: "No seller yet" }, { status: 409 });
  }

  const requested = Number(new URL(request.url).searchParams.get("amount"));
  const amount = Number.isFinite(requested) && requested > 0 ? requested : DEMO_PAYOUT_AMOUNT;

  try {
    const page = await whop().payouts.supportedMethods.list({
      account_id: state.sellerId,
      amount,
      currency: "usd",
    });

    // The list comes back 20 to a page. Iterating the page walks every one of
    // them, so a seller with a long list of banks still sees all of them.
    const destinations = [];
    for await (const destination of page) destinations.push(destination);
    const rails = destinations.map(formatRail).sort(compareRails);

    // An empty list is the normal state for a seller who has not verified yet,
    // so always say why rather than showing nothing. required_actions only
    // fills in once a verification exists, so a brand new seller has an empty
    // array and still needs an answer.
    let blocked: BlockedReason | null = null;
    if (rails.length === 0) {
      const account = await whop().accounts.retrieve({ id: state.sellerId });
      const action = (account.required_actions ?? []).find(
        (entry) => entry.action === "verify_identity",
      );

      blocked = action
        ? {
            title: action.title ?? "Verification needed",
            description: action.description ?? "",
            blockedCapabilities: action.blocked_capabilities ?? [],
          }
        : {
            title: "They have not proved who they are yet",
            description:
              "Whop will not offer a way to be paid until it knows who is being paid.",
            blockedCapabilities: Object.entries(account.capabilities ?? {})
              .filter(([name, value]) => name.endsWith("_payout") && value !== "active")
              .map(([name]) => name),
          };
    }

    return NextResponse.json({ amount, rails, blocked });
  } catch (error) {
    console.error("rails_failed", error);
    return NextResponse.json({ error: "Could not load payout options" }, { status: 502 });
  }
}
