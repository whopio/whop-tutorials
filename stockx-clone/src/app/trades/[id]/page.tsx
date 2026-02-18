"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ORDER_STATUSES } from "@/constants";
import { TradeChat } from "@/components/TradeChat";
import { DemoModal } from "@/components/DemoModal";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

interface Trade {
  id: string;
  price: number;
  platformFee: number;
  chatChannelId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  buyerId: string;
  sellerId: string;
  productSize: {
    size: string;
    product: {
      id: string;
      name: string;
      brand: string;
      images: string[];
      sku: string;
    };
  };
  buyer: { id: string; username: string; displayName: string | null };
  seller: { id: string; username: string; displayName: string | null };
  payment: {
    id: string;
    whopPaymentId: string;
    amount: number;
    platformFee: number;
    status: string;
    createdAt: string;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  MATCHED: "bg-yellow-500/20 text-yellow-400",
  PAYMENT_PENDING: "bg-orange-500/20 text-orange-400",
  PAID: "bg-blue-500/20 text-blue-400",
  SHIPPED: "bg-indigo-500/20 text-indigo-400",
  AUTHENTICATING: "bg-purple-500/20 text-purple-400",
  VERIFIED: "bg-green-500/20 text-green-400",
  DELIVERED: "bg-green-600/20 text-green-300",
  FAILED: "bg-red-500/20 text-red-400",
  REFUNDED: "bg-gray-500/20 text-gray-400",
};

export default function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUserId(data.user.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchTrade() {
      try {
        const res = await fetch(`/api/trades/${id}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load trade");
        }
        const data = await res.json();
        setTrade(data.trade);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trade");
      } finally {
        setIsLoading(false);
      }
    }

    if (id) fetchTrade();
  }, [id]);

  const handlePayNow = async () => {
    if (!trade) return;
    if (IS_DEMO) { setDemoOpen(true); return; }
    setIsCheckingOut(true);
    try {
      const res = await fetch(`/api/trades/${trade.id}/checkout`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create checkout");
      }
      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setIsCheckingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading trade...</div>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Trade not found"}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const product = trade.productSize.product;
  const isBuyer = currentUserId === trade.buyerId;
  const showPayNow = isBuyer && trade.status === "MATCHED" && !trade.payment;

  const isParticipant = currentUserId === trade.buyerId || currentUserId === trade.sellerId;

  return (
    <div className="min-h-screen bg-gray-950 py-8 px-4">
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
      <div className={`mx-auto ${isParticipant && trade.chatChannelId ? "max-w-6xl" : "max-w-3xl"}`}>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-gray-400 hover:text-gray-200 mb-6 flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to Dashboard
        </button>

        <div className={`grid gap-6 ${isParticipant && trade.chatChannelId ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        <div className="card p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
              {product.images[0] ? (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                  No image
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-gray-100 truncate">
                {product.name}
              </h1>
              <p className="text-sm text-gray-400">
                {product.brand} &middot; Size {trade.productSize.size} &middot;{" "}
                {product.sku}
              </p>
              <div className="mt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    STATUS_COLORS[trade.status] || "bg-gray-700 text-gray-300"
                  }`}
                >
                  {ORDER_STATUSES[trade.status] || trade.status}
                </span>
              </div>
            </div>
          </div>

          {/* Pay Now CTA */}
          {showPayNow && (
            <div className="bg-brand-600/10 border border-brand-600/30 rounded-lg p-4">
              <p className="text-sm text-gray-300 mb-3">
                This trade is waiting for payment. Complete your purchase to
                proceed.
              </p>
              <button
                onClick={handlePayNow}
                disabled={isCheckingOut}
                className="btn-primary w-full"
              >
                {isCheckingOut
                  ? "Redirecting to checkout..."
                  : `Pay Now — $${trade.price.toLocaleString()}`}
              </button>
            </div>
          )}

          {/* Trade Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Trade Price</p>
              <p className="text-lg font-semibold text-gray-100">
                ${trade.price.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Platform Fee</p>
              <p className="text-lg font-semibold text-gray-100">
                ${trade.platformFee.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Your Role</p>
              <p className="text-lg font-semibold text-gray-100">
                {isBuyer ? "Buyer" : "Seller"}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Trade Date</p>
              <p className="text-lg font-semibold text-gray-100">
                {new Date(trade.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Parties */}
          <div className="border-t border-gray-800 pt-4">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Parties</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Buyer</p>
                <p className="text-sm text-gray-200">
                  {trade.buyer.displayName || trade.buyer.username}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Seller</p>
                <p className="text-sm text-gray-200">
                  {trade.seller.displayName || trade.seller.username}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {trade.payment && (
            <div className="border-t border-gray-800 pt-4">
              <h2 className="text-sm font-medium text-gray-400 mb-3">
                Payment
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm text-gray-200">
                    {trade.payment.status}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="text-sm text-gray-200">
                    ${trade.payment.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Payment ID</p>
                  <p className="text-sm text-gray-200 font-mono text-xs truncate">
                    {trade.payment.whopPaymentId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Paid On</p>
                  <p className="text-sm text-gray-200">
                    {new Date(trade.payment.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Product Link */}
          <div className="border-t border-gray-800 pt-4">
            <button
              onClick={() => router.push(`/products/${product.id}`)}
              className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
            >
              View Product Page &rarr;
            </button>
          </div>
        </div>

        {/* Chat Panel */}
        {isParticipant && trade.chatChannelId && (
          <div className="card p-4">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Trade Chat</h2>
            <TradeChat channelId={trade.chatChannelId} />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
