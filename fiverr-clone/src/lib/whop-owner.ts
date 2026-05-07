import Whop from '@whop/sdk';

const WHOP_OWNER_TIMEOUT_MS = 8000;

/**
 * Get the Whop user ID of the company/ledger owner (for setting profiles.whop_user_id).
 * Uses ledger API first (owner.id when owner is User); falls back to companies.retrieve(owner_user.id).
 * Times out after 8s so callers never hang.
 */
export async function getWhopOwnerUserId(
  whopCompanyId: string,
  apiKey: string
): Promise<string | null> {
  const timeout = new Promise<null>((_, reject) =>
    setTimeout(() => reject(new Error('whop-owner timeout')), WHOP_OWNER_TIMEOUT_MS)
  );
  const work = (async () => {
    const whop = new Whop({ apiKey });
    const ledger = await whop.ledgerAccounts.retrieve(whopCompanyId);
    const owner = ledger.owner as { typename?: string; id?: string } | null | undefined;
    if (owner && typeof owner === 'object' && 'typename' in owner && owner.typename === 'User' && owner.id) {
      return owner.id;
    }
    const company = await whop.companies.retrieve(whopCompanyId);
    if (company?.owner_user?.id) {
      return company.owner_user.id;
    }
    return null;
  })();
  try {
    return await Promise.race([work, timeout]);
  } catch (err) {
    console.error('[whop-owner]', err);
    return null;
  }
}
