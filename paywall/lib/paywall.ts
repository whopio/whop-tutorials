import { cache } from "react";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";

export const checkProductAccess = cache(
  async (productId: string, whopUserId: string): Promise<boolean> => {
    try {
      const result = await getWhop().users.checkAccess({
        id: whopUserId,
        resource_id: productId,
      });
      return result.has_access;
    } catch {
      return false;
    }
  },
);

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
