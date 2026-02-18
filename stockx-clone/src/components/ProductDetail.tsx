"use client";

import { useState } from "react";
import Image from "next/image";
import { BidForm } from "@/components/BidForm";
import { AskForm } from "@/components/AskForm";
import { OrderBook } from "@/components/OrderBook";
import { PriceChart } from "@/components/PriceChart";
import { useRealtimeBids } from "@/hooks/useRealtimeBids";

interface ProductInfo {
  id: string;
  name: string;
  brand: string;
  sku: string;
  description: string;
  images: string[];
  retailPrice: number;
  category: string;
}

interface SizeInfo {
  id: string;
  size: string;
  lowestAsk: number | null;
  highestBid: number | null;
  lastSalePrice: number | null;
  salesCount: number;
}

interface TradePoint {
  price: number;
  createdAt: string;
}

interface MarketSummary {
  lastSale: number | null;
  avgPrice: number | null;
  totalSales: number;
  premiumDiscount: string | null;
}

interface ProductDetailProps {
  product: ProductInfo;
  sizes: SizeInfo[];
  trades: TradePoint[];
  marketSummary: MarketSummary;
}

export function ProductDetail({
  product,
  sizes,
  trades,
  marketSummary,
}: ProductDetailProps) {
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(
    sizes[0]?.id || null
  );
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [currentImage, setCurrentImage] = useState(0);

  const { bids, asks } = useRealtimeBids(selectedSizeId || "");

  const images =
    product.images.length > 0
      ? product.images
      : ["https://placehold.co/600x600/1f2937/6b7280?text=No+Image"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Images + Info */}
      <div className="space-y-6">
        {/* Image Gallery */}
        <div className="card overflow-hidden">
          <div className="relative aspect-square bg-gray-800">
            <Image
              src={images[currentImage]}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                    currentImage === i
                      ? "border-brand-600"
                      : "border-transparent"
                  }`}
                >
                  <Image
                    src={img}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {product.brand}
          </p>
          <h1 className="text-2xl font-bold text-gray-100">{product.name}</h1>
          <div className="flex gap-4 text-sm text-gray-400">
            <span>SKU: {product.sku}</span>
            <span>Retail: ${product.retailPrice.toLocaleString()}</span>
            <span>{product.category}</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Market Summary */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Market Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Last Sale</p>
              <p className="text-lg font-semibold text-gray-100">
                {marketSummary.lastSale !== null
                  ? `$${marketSummary.lastSale.toLocaleString()}`
                  : "--"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Price</p>
              <p className="text-lg font-semibold text-gray-100">
                {marketSummary.avgPrice !== null
                  ? `$${Math.round(marketSummary.avgPrice).toLocaleString()}`
                  : "--"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Sales</p>
              <p className="text-lg font-semibold text-gray-100">
                {marketSummary.totalSales.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Premium</p>
              <p
                className={`text-lg font-semibold ${
                  marketSummary.premiumDiscount !== null
                    ? Number(marketSummary.premiumDiscount) >= 0
                      ? "text-brand-400"
                      : "text-red-400"
                    : "text-gray-100"
                }`}
              >
                {marketSummary.premiumDiscount !== null
                  ? `${Number(marketSummary.premiumDiscount) >= 0 ? "+" : ""}${marketSummary.premiumDiscount}%`
                  : "--"}
              </p>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <PriceChart trades={trades} />
      </div>

      {/* Right: Trade Panel */}
      <div className="space-y-6">
        {/* Size Grid */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Select Size
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {sizes.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSizeId(s.id)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  selectedSizeId === s.id
                    ? "border-brand-600 bg-brand-600/10"
                    : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                }`}
              >
                <p className="text-sm font-medium text-gray-200">{s.size}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {s.lowestAsk ? `$${s.lowestAsk.toLocaleString()}` : "--"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Buy/Sell Tabs */}
        <div className="card overflow-hidden">
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setTab("buy")}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                tab === "buy"
                  ? "text-brand-400 border-b-2 border-brand-400 bg-brand-600/5"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setTab("sell")}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                tab === "sell"
                  ? "text-red-400 border-b-2 border-red-400 bg-red-600/5"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Sell
            </button>
          </div>
          <div className="p-4">
            {tab === "buy" ? (
              <BidForm
                productSizes={sizes}
                selectedSize={selectedSizeId}
                onSizeChange={setSelectedSizeId}
              />
            ) : (
              <AskForm
                productSizes={sizes}
                selectedSize={selectedSizeId}
                onSizeChange={setSelectedSizeId}
              />
            )}
          </div>
        </div>

        {/* Order Book */}
        <OrderBook bids={bids} asks={asks} />
      </div>
    </div>
  );
}
