import { WHOP_IDS } from "@/constants/whop-ids";
import { evaluateCode, previewPrice } from "@/lib/promo";

// "Is this code any good?", answered before the buyer reaches checkout,
// because the checkout itself stays silent about a dead one.
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
