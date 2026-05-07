import Whop from '@whop/sdk';

/**
 * Fetch KYC verification status from Whop for a seller's company.
 * Uses GET /ledger_accounts/{company_id} - payout_account_details.latest_verification.status
 * Requires WHOP_API_KEY with company:balance:read and payout:account:read permissions.
 */
export async function getWhopVerificationStatus(
  whopCompanyId: string,
  apiKey: string
): Promise<{ verified: boolean; status?: string; error?: string }> {
  try {
    const whop = new Whop({ apiKey });
    const ledger = await whop.ledgerAccounts.retrieve(whopCompanyId);

    const payout = ledger.payout_account_details;
    if (!payout?.latest_verification) {
      return { verified: false, status: 'not_started' };
    }

    const verStatus = payout.latest_verification.status;
    // Whop uses "approved" or "verified" for completed KYC
    const verified = verStatus === 'verified' || verStatus === 'approved';

    return { verified, status: verStatus };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Whop ledger fetch error:', msg, '(company:', whopCompanyId, ')');
    // 403 often means API key lacks company:balance:read or payout:account:read
    return { verified: false, error: msg };
  }
}
