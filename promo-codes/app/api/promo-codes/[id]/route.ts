import { z } from "zod";
import { WHOP_IDS } from "@/constants/whop-ids";
import { activatePromoCode, deactivatePromoCode } from "@/lib/promo";

const patchSchema = z.object({
  action: z.enum(["activate", "deactivate"]),
});

const SEEDED_IDS = new Set<string>(WHOP_IDS.promoCodes.map((promo) => promo.id));

// Pause and resume, and nothing else. Both directions are reversible, which is
// what makes them safe to hand a stranger. Archiving is not reversible, so this
// demo never offers it, and the id has to be one of ours either way.
//
// Both verbs are on the SDK's promoCodes resource, as deactivate and activate,
// which lib/promo.ts wraps.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!SEEDED_IDS.has(id)) {
    return Response.json({ error: "unknown_code" }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_action" }, { status: 400 });
  }

  const code =
    parsed.data.action === "deactivate"
      ? await deactivatePromoCode(id)
      : await activatePromoCode(id);

  return Response.json({ code });
}
