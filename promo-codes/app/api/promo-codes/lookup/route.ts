import { WHOP_IDS } from "@/constants/whop-ids";
import { evaluateCode, previewPrice } from "@/lib/promo";

// "Is this code any good?", answered before the buyer reaches checkout, so the
// page can show the real price, or call a code dead, before the checkout does.
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  const verdict = await evaluateCode(code);

  return Response.json({
    ...verdict,
    preview:
      verdict.usable && verdict.promo
        ? previewPrice(WHOP_IDS.price, verdict.promo.promoType, verdict.promo.displayAmount)
        : null,
  });
}
