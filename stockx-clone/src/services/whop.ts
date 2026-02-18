import { whopsdk } from "@/lib/whop";
import { env } from "@/lib/env";

interface TradeForCheckout {
  id: string;
  price: number;
  platformFee: number;
  buyerId: string;
  sellerId: string;
  seller: {
    whopId: string;
    connectedAccountId?: string | null;
  };
}

interface CheckoutResult {
  checkoutUrl: string;
  checkoutId: string;
}

/**
 * Creates a Whop checkout session for a matched trade.
 * Uses the seller's connected account as the destination,
 * with the platform fee as the application_fee_amount.
 */
export async function createCheckoutForTrade(
  trade: TradeForCheckout
): Promise<CheckoutResult> {
  if (!trade.seller.connectedAccountId) {
    throw new Error("Seller does not have a connected Whop account");
  }

  const checkoutConfig = await whopsdk.checkoutConfigurations.create({
    redirect_url: `${env.NEXT_PUBLIC_APP_URL}/api/trades/${trade.id}/payment-callback`,
    plan: {
      company_id: trade.seller.connectedAccountId,
      currency: "usd",
      initial_price: trade.price,
      plan_type: "one_time",
      application_fee_amount: trade.platformFee,
    },
    metadata: {
      tradeId: trade.id,
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
    },
  });

  if (!checkoutConfig || !checkoutConfig.id) {
    throw new Error("Failed to create checkout session");
  }

  return {
    checkoutUrl: checkoutConfig.purchase_url as string,
    checkoutId: checkoutConfig.id,
  };
}

/**
 * Retrieves the status of a payment from Whop.
 */
export async function getPaymentStatus(paymentId: string) {
  const payment = await whopsdk.payments.retrieve(paymentId);
  return payment;
}

/**
 * Initiates a refund for a payment via Whop.
 */
export async function refundPayment(paymentId: string) {
  const refund = await whopsdk.payments.refund(paymentId);
  return refund;
}

/**
 * Creates a transfer to a seller's connected account via Whop.
 * Used to release escrowed funds after item authentication.
 */
export async function createTransfer(
  amount: number,
  originCompanyId: string,
  destinationCompanyId: string,
  metadata: Record<string, string>
) {
  const transfer = await whopsdk.transfers.create({
    amount,
    currency: "usd",
    origin_id: originCompanyId,
    destination_id: destinationCompanyId,
    metadata,
  });

  return transfer;
}
