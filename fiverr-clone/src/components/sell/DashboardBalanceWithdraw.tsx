'use client';

import { useEffect, useState } from 'react';
import { Wallet, CreditCard, X } from 'lucide-react';
import { C, GFButton, GFInput } from '@/components/gigflow/design-system';
import { useHasPayoutsSession } from './SellPayoutsProvider';
import { AddPayoutMethodButton } from './AddPayoutMethodButton';

interface BalanceItem {
  balance: number;
  currency: string;
  pending_balance: number;
  reserve_balance: number;
}

interface PayoutMethod {
  id: string;
  account_reference: string | null;
  institution_name: string | null;
  nickname: string | null;
  is_default: boolean;
  currency: string;
  category?: string;
  name?: string;
}

export function DashboardBalanceWithdraw() {
  const hasPayoutsSession = useHasPayoutsSession();
  const [balance, setBalance] = useState<{
    balances: BalanceItem[];
    message?: string;
  } | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [addPayoutLoading, setAddPayoutLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balanceRes, methodsRes] = await Promise.all([
        fetch('/api/sell/balance'),
        fetch('/api/sell/payout-methods'),
      ]);
      const balanceData = await balanceRes.json();
      const methodsData = await methodsRes.json();
      setBalance(balanceData);
      setPayoutMethods(methodsData.payoutMethods || []);
      const defaultPm = (methodsData.payoutMethods || []).find((p: PayoutMethod) => p.is_default);
      setSelectedPayoutId(defaultPm?.id || (methodsData.payoutMethods?.[0]?.id) || null);
    } catch {
      setBalance({ balances: [] });
      setPayoutMethods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPayoutMethod = async () => {
    setAddPayoutLoading(true);
    try {
      const res = await fetch('/api/sell/onboard/link');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setAddPayoutLoading(false);
      }
    } catch {
      setAddPayoutLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      const res = await fetch('/api/sell/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'usd',
          payout_method_id: selectedPayoutId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWithdrawError(data.error || 'Withdrawal failed');
        setWithdrawing(false);
        return;
      }
      setWithdrawOpen(false);
      setWithdrawAmount('');
      fetchData();
    } catch {
      setWithdrawError('Something went wrong');
    } finally {
      setWithdrawing(false);
    }
  };

  const primaryBalance = balance?.balances?.[0];
  const availableCents = primaryBalance?.balance ?? 0;
  const pendingCents = primaryBalance?.pending_balance ?? 0;
  const currency = primaryBalance?.currency ?? 'usd';

  const formatMoney = (cents: number) => {
    const d = cents / 100;
    return d >= 1000 ? `$${(d / 1000).toFixed(1)}k` : `$${d.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div
        className="rounded-2xl border p-5 animate-pulse"
        style={{ backgroundColor: C.white, borderColor: C.border }}
      >
        <div className="h-20 bg-black/5 rounded-xl" />
      </div>
    );
  }

  if (balance?.message && !primaryBalance) {
    return (
      <div
        className="rounded-2xl border p-5"
        style={{ backgroundColor: C.white, borderColor: C.border }}
      >
        <h3 className="font-bold text-sm mb-2" style={{ color: C.ink }}>
          Balance
        </h3>
        <p className="text-sm mb-4" style={{ color: C.muted }}>
          {balance.message}
        </p>
        <GFButton variant="outline" size="sm" onClick={handleAddPayoutMethod} disabled={addPayoutLoading}>
          {addPayoutLoading ? 'Loading...' : 'Complete verification'}
        </GFButton>
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-2xl border p-5"
        style={{ backgroundColor: C.white, borderColor: C.border }}
      >
        <h3 className="font-bold text-sm mb-4" style={{ color: C.ink }}>
          Balance
        </h3>
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: C.muted }}>Available</span>
            <span className="font-bold" style={{ color: C.ink }}>{formatMoney(availableCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: C.muted }}>Pending</span>
            <span className="font-semibold" style={{ color: C.muted }}>{formatMoney(pendingCents)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <GFButton
            variant="brand"
            size="sm"
            className="w-full"
            iconLeft={<Wallet size={14} />}
            onClick={() => setWithdrawOpen(true)}
            disabled={availableCents < 100}
          >
            Withdraw funds
          </GFButton>
          {hasPayoutsSession ? (
            <AddPayoutMethodButton
              onSuccess={fetchData}
              fallbackButton={(loading) => (
                <button
                  type="button"
                  onClick={handleAddPayoutMethod}
                  disabled={addPayoutLoading || loading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors hover:bg-black/5"
                  style={{ borderColor: C.border, color: C.ink }}
                >
                  <CreditCard size={14} />
                  {addPayoutLoading || loading ? 'Loading...' : 'Add payout method'}
                </button>
              )}
            />
          ) : (
            <button
              type="button"
              onClick={handleAddPayoutMethod}
              disabled={addPayoutLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors hover:bg-black/5"
              style={{ borderColor: C.border, color: C.ink }}
            >
              <CreditCard size={14} />
              {addPayoutLoading ? 'Loading...' : 'Add payout method'}
            </button>
          )}
        </div>
      </div>

      {withdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-xl"
            style={{ backgroundColor: C.white, borderColor: C.border }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: C.ink }}>Withdraw funds</h3>
              <button
                type="button"
                onClick={() => { setWithdrawOpen(false); setWithdrawError(null); }}
                className="p-2 rounded-lg hover:bg-black/5"
                style={{ color: C.muted }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: C.surface, borderColor: C.border }}>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: C.muted }}>Available to withdraw</span>
                <span className="font-bold" style={{ color: C.ink }}>{formatMoney(availableCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: C.muted }}>Pending</span>
                <span style={{ color: C.muted }}>{formatMoney(pendingCents)}</span>
              </div>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <GFInput
                label="Amount (USD)"
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />

              {payoutMethods.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: C.ink }}>
                    Payout method
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {payoutMethods.map((pm) => (
                      <label
                        key={pm.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          selectedPayoutId === pm.id ? 'border-orange-400' : ''
                        }`}
                        style={{
                          borderColor: selectedPayoutId === pm.id ? C.brand : C.border,
                          backgroundColor: selectedPayoutId === pm.id ? C.brandMuted : C.surface,
                        }}
                      >
                        <input
                          type="radio"
                          name="payout"
                          checked={selectedPayoutId === pm.id}
                          onChange={() => setSelectedPayoutId(pm.id)}
                          className="sr-only"
                        />
                        <CreditCard size={16} style={{ color: C.muted }} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: C.ink }}>
                            {pm.nickname || pm.institution_name || pm.name || 'Payout method'}
                          </p>
                          {pm.account_reference && (
                            <p className="text-xs" style={{ color: C.muted }}>•••• {pm.account_reference}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {payoutMethods.length === 0 && (
                <p className="text-sm" style={{ color: C.muted }}>
                  Add a payout method to receive withdrawals.
                </p>
              )}

              {withdrawError && (
                <p className="text-sm" style={{ color: C.error }}>{withdrawError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <GFButton
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setWithdrawOpen(false); setWithdrawError(null); }}
                >
                  Cancel
                </GFButton>
                <GFButton
                  type="submit"
                  variant="brand"
                  className="flex-1"
                  disabled={
                    withdrawing ||
                    !withdrawAmount ||
                    parseFloat(withdrawAmount) <= 0 ||
                    parseFloat(withdrawAmount) * 100 > availableCents ||
                    (payoutMethods.length > 0 && !selectedPayoutId)
                  }
                >
                  {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                </GFButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
