import { WhopClient, WhopEnvironment } from '@whop/sdk';

const WHOP_OWNER_TIMEOUT_MS = 8000;

/**
 * Get the Whop user ID of the company/ledger owner (for setting profiles.whop_user_id).
 * Uses ledger API first (owner.id when owner is User); falls back to accounts.retrieve(owner.id).
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
    const whop = new WhopClient({
      token: apiKey,
      environment:
        process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === 'production'
          ? WhopEnvironment.Production
          : WhopEnvironment.Sandbox,
    });
    const ledger = await whop.ledgerAccounts.retrieve({ id: whopCompanyId });
    const owner = ledger.owner as { typename?: string; id?: string } | null | undefined;
    if (owner && typeof owner === 'object' && 'typename' in owner && owner.typename === 'User' && owner.id) {
      return owner.id;
    }
    const company = await whop.accounts.retrieve({ id: whopCompanyId });
    if (company?.owner?.id) {
      return company.owner.id;
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
