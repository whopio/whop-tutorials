import { test } from "node:test";
import assert from "node:assert/strict";
import { formatRail } from "./quotes.ts";

test("formats a standard bank quote", () => {
  const result = formatRail({
    id: "podst_uo62nBbfOFHo",
    name: "T.GARANTI BANKASI A.S.",
    delivery_type: "bank_deposit",
    supports_instant_delivery: false,
    quotes: [
      {
        destination_currency: "try",
        amount: 100,
        currency: "usd",
        exchange_rate: 46.36,
        min_limit: 10,
        max_limit: 21561.05,
        standard: {
          fee: 2.7,
          total_received: 97.3,
          estimated_arrival: "2026-08-06T14:38:08+02:00",
        },
        instant: null,
      },
    ],
  });

  assert.equal(result.fee, 2.7);
  assert.equal(result.received, 97.3);
  assert.equal(result.available, true);
  assert.equal(result.kind, "bank");
  assert.equal(result.currency, "try");
});

test("a null standard speed is unavailable, not an error", () => {
  const result = formatRail({
    id: "podst_x",
    name: "Nowhere Bank",
    delivery_type: "bank_deposit",
    supports_instant_delivery: false,
    quotes: [
      {
        destination_currency: "usd",
        amount: 100,
        currency: "usd",
        exchange_rate: 1,
        min_limit: 10,
        max_limit: null,
        standard: null,
        instant: null,
      },
    ],
  });

  assert.equal(result.available, false);
  assert.equal(result.fee, null);
  assert.equal(result.currency, "usd");
});

test("a rail with no quotes at all is unavailable", () => {
  const result = formatRail({
    id: "podst_y",
    name: "Empty",
    delivery_type: "cryptocurrency",
    supports_instant_delivery: false,
    quotes: [],
  });

  assert.equal(result.available, false);
  assert.equal(result.kind, "crypto");
  assert.equal(result.currency, null);
});

test("null quotes and a null name still give a row", () => {
  const result = formatRail({
    id: "podst_z",
    name: null,
    delivery_type: "bank_deposit",
    supports_instant_delivery: false,
    quotes: null,
  });

  assert.equal(result.available, false);
  assert.equal(result.name, "Unnamed payout method");
  assert.equal(result.currency, null);
});

test("reads the crypto delivery type observed live on the Bitcoin rail", () => {
  const result = formatRail({
    id: "podst_ikmm1h35yeEt",
    name: "Bitcoin",
    delivery_type: "cryptocurrency",
    supports_instant_delivery: false,
    quotes: [
      {
        destination_currency: "btc",
        amount: 25,
        currency: "usd",
        exchange_rate: 0.0000096,
        min_limit: 10,
        max_limit: null,
        standard: {
          fee: 12.7,
          total_received: 12.3,
          estimated_arrival: "2026-08-05T15:32:07+02:00",
        },
        instant: null,
      },
    ],
  });

  assert.equal(result.kind, "crypto");
  assert.equal(result.fee, 12.7);
  assert.equal(result.received, 12.3);
  assert.equal(result.currency, "btc");
});

test("sorts banks before crypto and unavailable rails last", () => {
  const rails = [
    { id: "c", name: "Bitcoin", kind: "crypto" as const, available: true },
    { id: "d", name: "Broken Bank", kind: "bank" as const, available: false },
    { id: "a", name: "Alpha Bank", kind: "bank" as const, available: true },
  ].map((r) => ({
    ...r,
    fee: null,
    received: null,
    arrivesOn: null,
    currency: null,
    unavailableReason: null,
  }));

  const sorted = [...rails].sort(compareRails);
  assert.deepEqual(
    sorted.map((r) => r.id),
    ["a", "c", "d"],
  );
});

// Imported after the assertions above so a missing export fails loudly.
import { compareRails } from "./quotes.ts";
