"use client";

import { useEffect, useState } from "react";
import { Button, Select, Text, TextField } from "@whop/react/components";
import { Panel, Chip } from "@/components/Panel";
import {
  DEFAULT_SELLER_COUNTRY,
  SELLER_COUNTRIES,
  SELLER_NAMES,
  randomSellerName,
} from "@/constants/whop-ids";

export type Seller = { sellerId: string; title: string; country: string };

export function SellerPanel({
  seller,
  onCreated,
  onLog,
}: {
  seller: Seller | null;
  onCreated: (seller: Seller) => void;
  onLog: (kind: string, detail: string) => void;
}) {
  // Seeded after mount rather than in the initial state, so the server and the
  // first client render agree on what is on the page.
  const [title, setTitle] = useState<string>(SELLER_NAMES[0]);
  const [country, setCountry] = useState<string>(DEFAULT_SELLER_COUNTRY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(randomSellerName());
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    onLog("POST", "/api/seller");

    try {
      const response = await fetch("/api/seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, country }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not create the account");
        onLog("ERR", data.error ?? "seller create failed");
        return;
      }

      onCreated(data);
      onLog("OK", data.sellerId);
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      annotationId="seller"
      step={2}
      title="Give them an account"
      blurb="This seller just joined our marketplace. Whop gives them their own account underneath ours."
      aside={seller ? <Chip label="account" value={seller.sellerId} /> : undefined}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <Text size="1" color="gray">
            Seller name
          </Text>
          <TextField.Root>
            <TextField.Input
              value={title}
              disabled={Boolean(seller) || busy}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={SELLER_NAMES[0]}
            />
          </TextField.Root>
        </label>

        <label className="flex flex-col gap-1 sm:w-44">
          <Text size="1" color="gray">
            Where they live
          </Text>
          <Select.Root
            value={country}
            disabled={Boolean(seller) || busy}
            onValueChange={setCountry}
          >
            <Select.Trigger />
            <Select.Content>
              {SELLER_COUNTRIES.map((c) => (
                <Select.Item key={c.code} value={c.code}>
                  {c.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </label>

        <Button onClick={create} disabled={Boolean(seller) || busy || !title.trim()}>
          {busy ? "Creating..." : seller ? "Created" : "Create the account"}
        </Button>
      </div>

      {error && (
        <Text size="1" color="red" as="p" className="mt-3">
          {error}
        </Text>
      )}

      {seller && (
        <Text size="2" color="gray" as="p" className="mt-3">
          That id is a real account on Whop, and it belongs to the seller rather than
          to us.
        </Text>
      )}
    </Panel>
  );
}
