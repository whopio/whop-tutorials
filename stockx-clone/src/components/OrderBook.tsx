"use client";

interface OrderEntry {
  price: number;
  status: string;
}

interface OrderBookProps {
  bids: OrderEntry[];
  asks: OrderEntry[];
}

interface AggregatedLevel {
  price: number;
  quantity: number;
}

function aggregateOrders(orders: OrderEntry[]): AggregatedLevel[] {
  const map = new Map<number, number>();
  for (const order of orders) {
    if (order.status !== "ACTIVE") continue;
    map.set(order.price, (map.get(order.price) || 0) + 1);
  }
  return Array.from(map.entries()).map(([price, quantity]) => ({
    price,
    quantity,
  }));
}

export function OrderBook({ bids, asks }: OrderBookProps) {
  const bidLevels = aggregateOrders(bids).sort((a, b) => b.price - a.price);
  const askLevels = aggregateOrders(asks).sort((a, b) => a.price - b.price);

  const maxBidQty = Math.max(1, ...bidLevels.map((l) => l.quantity));
  const maxAskQty = Math.max(1, ...askLevels.map((l) => l.quantity));

  const highestBid = bidLevels[0]?.price ?? 0;
  const lowestAsk = askLevels[0]?.price ?? 0;
  const spread =
    highestBid > 0 && lowestAsk > 0 ? lowestAsk - highestBid : null;
  const spreadPercent =
    spread !== null && highestBid > 0
      ? ((spread / highestBid) * 100).toFixed(1)
      : null;

  const maxRows = 8;
  const displayBids = bidLevels.slice(0, maxRows);
  const displayAsks = askLevels.slice(0, maxRows);

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Order Book</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Bids */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-2 px-1">
            <span>Price</span>
            <span>Qty</span>
          </div>
          <div className="space-y-1">
            {displayBids.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">No bids</p>
            ) : (
              displayBids.map((level) => (
                <div key={level.price} className="relative">
                  <div
                    className="absolute inset-y-0 right-0 bg-brand-600/15 rounded-r"
                    style={{
                      width: `${(level.quantity / maxBidQty) * 100}%`,
                    }}
                  />
                  <div className="relative flex justify-between items-center px-2 py-1 text-sm">
                    <span className="text-brand-400 font-medium">
                      ${level.price.toLocaleString()}
                    </span>
                    <span className="text-gray-400">{level.quantity}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Asks */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-2 px-1">
            <span>Price</span>
            <span>Qty</span>
          </div>
          <div className="space-y-1">
            {displayAsks.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">No asks</p>
            ) : (
              displayAsks.map((level) => (
                <div key={level.price} className="relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-red-600/15 rounded-l"
                    style={{
                      width: `${(level.quantity / maxAskQty) * 100}%`,
                    }}
                  />
                  <div className="relative flex justify-between items-center px-2 py-1 text-sm">
                    <span className="text-red-400 font-medium">
                      ${level.price.toLocaleString()}
                    </span>
                    <span className="text-gray-400">{level.quantity}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Spread */}
      {spread !== null && (
        <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-center gap-2 text-xs text-gray-500">
          <span>Spread:</span>
          <span className="text-gray-300 font-medium">
            ${spread.toLocaleString()}
          </span>
          <span>({spreadPercent}%)</span>
        </div>
      )}
    </div>
  );
}
