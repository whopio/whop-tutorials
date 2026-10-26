import { getWhop } from "@/lib/whop";

export interface FeeLine {
  label: string;
  amount: number;
}

export interface Receipt {
  paymentId: string;
  billingReason: string;
  paidAt: string | null;
  total: number;
  youKeep: number;
  fees: FeeLine[];
}

export interface Charge {
  id: string;
  billingReason: string;
  status: string;
  total: number;
  createdAt: string;
}

// Every charge on this subscription, newest first: the first payment, each
// renewal, and any renewal that failed.
export async function listCharges(membershipId: string): Promise<Charge[]> {
  const charges: Charge[] = [];
  for await (const payment of await getWhop().payments.list({
    membership_id: membershipId,
    order: "created_at",
    direction: "desc",
  })) {
    charges.push({
      id: payment.id,
      billingReason: payment.billing_reason ?? "unknown",
      status: payment.status,
      total: Number(payment.total?.amount ?? "0"),
      createdAt: payment.created_at,
    });
    if (charges.length === 12) break;
  }
  return charges;
}

// What one charge left you with. Whop lists its own fees as rows on the
// payment, and amount_after_fees is what lands in your balance.
export async function readReceipt(paymentId: string, membershipId: string): Promise<Receipt | null> {
  const whop = getWhop();
  const payment = await whop.payments.retrieve({ id: paymentId });
  if (payment.membership_id !== membershipId) return null;

  const { data: fees } = await whop.payments.listFees({ id: paymentId });
  return {
    paymentId,
    billingReason: payment.billing_reason ?? "unknown",
    paidAt: payment.paid_at,
    total: Number(payment.total?.amount ?? "0"),
    youKeep: Number(payment.amount_after_fees.amount),
    fees: fees.map((fee) => ({ label: fee.label, amount: Number(fee.settlement_amount.amount) })),
  };
}
