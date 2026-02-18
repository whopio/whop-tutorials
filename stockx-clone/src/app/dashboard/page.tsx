"use client";

import { useState } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type Tab = "overview" | "buying" | "selling" | "portfolio";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { user: currentUser, isLoading: authLoading } = useCurrentUser();
  const {
    activeBids,
    activeAsks,
    completedTrades,
    totalSpent,
    totalEarned,
    portfolioValue,
    isLoading,
    error,
  } = usePortfolio(!authLoading && !!currentUser);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "buying", label: "Buying" },
    { id: "selling", label: "Selling" },
    { id: "portfolio", label: "Portfolio" },
  ];

  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-800 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-6">Dashboard</h1>
        <div className="card p-8 text-center">
          <p className="text-gray-400 mb-4">Sign in to view your dashboard</p>
          <a href="/api/auth/login" className="btn-primary">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-6">Dashboard</h1>
        <div className="card p-8 text-center">
          <p className="text-gray-400 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-100 mb-6">Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === t.id
                ? "text-gray-100"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
            {activeTab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Active Bids"
              value={activeBids.length.toString()}
            />
            <SummaryCard
              label="Active Asks"
              value={activeAsks.length.toString()}
            />
            <SummaryCard
              label="Total Trades"
              value={completedTrades.length.toString()}
            />
            <SummaryCard
              label="Portfolio Value"
              value={`$${portfolioValue.toLocaleString()}`}
              accent
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-1">
                Total Spent
              </h3>
              <p className="text-2xl font-bold text-gray-100">
                ${totalSpent.toLocaleString()}
              </p>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-1">
                Total Earned
              </h3>
              <p className="text-2xl font-bold text-brand-400">
                ${totalEarned.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Buying Tab */}
      {activeTab === "buying" && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-200">Active Bids</h2>
          {activeBids.length === 0 ? (
            <EmptyState message="No active bids" />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Bid Price</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {activeBids.map((bid) => (
                    <tr key={bid.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-gray-200">
                            {bid.productSize.product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {bid.productSize.product.brand}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {bid.productSize.size}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-brand-400">
                        ${bid.price.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(bid.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-200 mt-8">
            Purchase History
          </h2>
          {completedTrades.filter((t) => t.status === "DELIVERED").length ===
          0 ? (
            <EmptyState message="No purchases yet" />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Price Paid</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {completedTrades
                    .filter((t) => t.status === "DELIVERED")
                    .map((trade) => (
                      <tr key={trade.id} className="hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-sm text-gray-200">
                          {trade.productSize.product.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {trade.productSize.size}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-200">
                          ${trade.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={trade.status} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Selling Tab */}
      {activeTab === "selling" && (
        <div className="space-y-6">
          {currentUser && !currentUser.connectedAccountId ? (
            <SellerOnboardingPrompt />
          ) : (
            <>
          <h2 className="text-lg font-semibold text-gray-200">Active Asks</h2>
          {activeAsks.length === 0 ? (
            <EmptyState message="No active asks" />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Ask Price</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {activeAsks.map((ask) => (
                    <tr key={ask.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-gray-200">
                            {ask.productSize.product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {ask.productSize.product.brand}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {ask.productSize.size}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-red-400">
                        ${ask.price.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(ask.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* Portfolio Tab */}
      {activeTab === "portfolio" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-200 mb-1">
              Portfolio Value
            </h2>
            <p className="text-3xl font-bold text-brand-400">
              ${portfolioValue.toLocaleString()}
            </p>
          </div>

          {completedTrades.length === 0 ? (
            <EmptyState message="No items in portfolio" />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Purchase Price</th>
                    <th className="px-4 py-3">Market Price</th>
                    <th className="px-4 py-3">Gain/Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {completedTrades.map((trade) => {
                    const marketPrice =
                      trade.productSize.lastSalePrice ?? trade.price;
                    const gainLoss = marketPrice - trade.price;
                    const gainPercent =
                      trade.price > 0
                        ? ((gainLoss / trade.price) * 100).toFixed(1)
                        : "0";

                    return (
                      <tr key={trade.id} className="hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-sm text-gray-200">
                          {trade.productSize.product.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {trade.productSize.size}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          ${trade.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          ${marketPrice.toLocaleString()}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm font-medium ${
                            gainLoss >= 0 ? "text-brand-400" : "text-red-400"
                          }`}
                        >
                          {gainLoss >= 0 ? "+" : ""}${gainLoss.toLocaleString()}{" "}
                          ({gainLoss >= 0 ? "+" : ""}
                          {gainPercent}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-6">
      <p className="text-sm text-gray-400">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${
          accent ? "text-brand-400" : "text-gray-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

function SellerOnboardingPrompt() {
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOnboard = async () => {
    setIsOnboarding(true);
    setError(null);
    try {
      const res = await fetch("/api/sellers/onboard", { method: "POST" });
      const data = await res.json();
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        setError(data.error || "Failed to start onboarding");
      }
    } catch {
      setError("Failed to start onboarding");
    } finally {
      setIsOnboarding(false);
    }
  };

  return (
    <div className="card p-8 text-center space-y-4">
      <h2 className="text-lg font-semibold text-gray-200">
        Start Selling
      </h2>
      <p className="text-gray-400 max-w-md mx-auto">
        To list items for sale, you need to complete seller verification through
        Whop. This sets up your payout account so you can receive funds when your
        items sell.
      </p>
      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <button
        onClick={handleOnboard}
        disabled={isOnboarding}
        className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {isOnboarding ? "Setting up..." : "Become a Seller"}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    MATCHED: "bg-yellow-500/10 text-yellow-400",
    PAYMENT_PENDING: "bg-yellow-500/10 text-yellow-400",
    PAID: "bg-blue-500/10 text-blue-400",
    SHIPPED: "bg-blue-500/10 text-blue-400",
    AUTHENTICATING: "bg-purple-500/10 text-purple-400",
    VERIFIED: "bg-brand-500/10 text-brand-400",
    DELIVERED: "bg-brand-500/10 text-brand-400",
    FAILED: "bg-red-500/10 text-red-400",
    REFUNDED: "bg-red-500/10 text-red-400",
  };

  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
        colors[status] || "bg-gray-800 text-gray-400"
      }`}
    >
      {status}
    </span>
  );
}
