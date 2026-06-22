"use client";

// The preview header's "Pro" chip. At rest it reads as a status badge;
// on hover it widens into a "Go Pro" button that opens the checkout
// modal (PaywallCard listens for the event).
export function ProBadgeCta() {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new Event("pulse:open-pro-checkout"))
      }
      className="group relative h-7 w-12 overflow-hidden rounded-full bg-[#FA4616]/10 text-xs font-semibold text-[#D13415] transition-all duration-300 hover:w-20 hover:bg-[#FA4616] hover:text-white hover:shadow-sm"
    >
      <span className="absolute inset-0 flex items-center justify-center opacity-100 transition-opacity duration-200 group-hover:opacity-0">
        Pro
      </span>
      <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        Go Pro
      </span>
    </button>
  );
}
