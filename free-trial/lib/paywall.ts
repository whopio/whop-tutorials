import { cache } from "react";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";

// React's cache() dedupes by primitive argument identity, so every gated
// component in one request shares a single checkAccess call per product.
export const checkProductAccess = cache(
  async (productId: string, whopUserId: string): Promise<boolean> => {
    const result = await getWhop().users.checkAccess(productId, {
      id: whopUserId,
    });
    return result.has_access;
  },
);

// A page is unlocked when the visitor owns any of the given products.
// Anonymous visitors short-circuit to false without an API call.
export async function hasAccess(
  productIds: Array<string | null | undefined>,
): Promise<boolean> {
  const session = await getSession();
  const whopUserId = session.whopUserId;
  if (!whopUserId) return false;

  const ids = productIds.filter((id): id is string => Boolean(id));
  const results = await Promise.all(
    ids.map((id) => checkProductAccess(id, whopUserId)),
  );
  return results.some(Boolean);
}
