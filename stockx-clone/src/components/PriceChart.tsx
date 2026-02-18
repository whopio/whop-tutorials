"use client";

import { useState, useMemo } from "react";

interface Trade {
  price: number;
  createdAt: string;
}

interface PriceChartProps {
  trades: Trade[];
}

const TIME_RANGES = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "ALL", days: Infinity },
] as const;

export function PriceChart({ trades }: PriceChartProps) {
  const [range, setRange] = useState<number>(30);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    price: number;
    date: string;
  } | null>(null);

  const filteredTrades = useMemo(() => {
    const sorted = [...trades].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    if (range === Infinity) return sorted;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - range);
    return sorted.filter((t) => new Date(t.createdAt) >= cutoff);
  }, [trades, range]);

  if (filteredTrades.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          Price History
        </h3>
        <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
          No trade history available
        </div>
      </div>
    );
  }

  const prices = filteredTrades.map((t) => t.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const width = 600;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 10, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = filteredTrades.map((t, i) => ({
    x:
      padding.left +
      (filteredTrades.length > 1
        ? (i / (filteredTrades.length - 1)) * chartWidth
        : chartWidth / 2),
    y:
      padding.top +
      chartHeight -
      ((t.price - minPrice) / priceRange) * chartHeight,
    price: t.price,
    date: new Date(t.createdAt).toLocaleDateString(),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${
    height - padding.bottom
  } L ${padding.left} ${height - padding.bottom} Z`;

  const firstPrice = filteredTrades[0].price;
  const lastPrice = filteredTrades[filteredTrades.length - 1].price;
  const trending = lastPrice >= firstPrice;
  const lineColor = trending ? "#08de5a" : "#ef4444";
  const fillColor = trending
    ? "rgba(8, 222, 90, 0.1)"
    : "rgba(239, 68, 68, 0.1)";

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    let closest = points[0];
    let closestDist = Infinity;
    for (const p of points) {
      const dist = Math.abs(p.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = p;
      }
    }

    setTooltip({
      x: closest.x,
      y: closest.y,
      price: closest.price,
      date: closest.date,
    });
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Price History</h3>
        <div className="flex gap-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r.days)}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                range === r.days
                  ? "bg-gray-700 text-gray-100"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          <path d={areaD} fill="url(#areaFill)" />
          <path
            d={pathD}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {tooltip && (
            <>
              <line
                x1={tooltip.x}
                y1={padding.top}
                x2={tooltip.x}
                y2={height - padding.bottom}
                stroke="#4b5563"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              <circle
                cx={tooltip.x}
                cy={tooltip.y}
                r="4"
                fill={lineColor}
                stroke="#111827"
                strokeWidth="2"
              />
            </>
          )}
        </svg>

        {tooltip && (
          <div
            className="absolute pointer-events-none bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs shadow-lg"
            style={{
              left: `${(tooltip.x / width) * 100}%`,
              top: "0",
              transform: "translateX(-50%)",
            }}
          >
            <p className="text-gray-100 font-medium">
              ${tooltip.price.toLocaleString()}
            </p>
            <p className="text-gray-500">{tooltip.date}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>${minPrice.toLocaleString()}</span>
        <span>${maxPrice.toLocaleString()}</span>
      </div>
    </div>
  );
}
