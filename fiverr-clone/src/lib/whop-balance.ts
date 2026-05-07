import Whop from '@whop/sdk';

export interface BalanceItem {
  balance: number;
  currency: string;
  pending_balance: number;
  reserve_balance: number;
}

export interface LedgerBalanceResult {
  balances: BalanceItem[];
  id?: string;
  ledger_type?: string;
  payments_approval_status?: string | null;
  error?: string;
}

/**
 * Fetch ledger balance for a seller's Whop company.
 * Requires WHOP_API_KEY with company:balance:read permission.
 */
export async function getWhopLedgerBalance(
  whopCompanyId: string,
  apiKey: string
): Promise<LedgerBalanceResult> {
  try {
    const whop = new Whop({ apiKey });
    const ledger = await whop.ledgerAccounts.retrieve(whopCompanyId);

    const balances = (ledger.balances || []).map((b) => ({
      balance: b.balance ?? 0,
      currency: (b.currency as string) ?? 'usd',
      pending_balance: b.pending_balance ?? 0,
      reserve_balance: b.reserve_balance ?? 0,
    }));

    return {
      id: ledger.id,
      balances,
      ledger_type: ledger.ledger_type ?? undefined,
      payments_approval_status: ledger.payments_approval_status ?? null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[whop-balance]', msg);
    return { balances: [], error: msg };
  }
}
