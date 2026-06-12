"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField, TextArea } from "@whop/react/components";
import { formatUsd } from "@/lib/fees";
import { Check } from "@/components/Icons";

export interface TierRow {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  benefits: string[];
  memberCount?: number;
}

export default function TierManager({ tiers }: { tiers: TierRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [benefitsText, setBenefitsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceDollars = Number(price);
    if (!Number.isFinite(priceDollars) || priceDollars <= 0) {
      setError("Enter a monthly price greater than $0.");
      return;
    }

    const benefits = benefitsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const res = await fetch("/api/tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          priceCents: Math.round(priceDollars * 100),
          description: description || undefined,
          benefits,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create tier");
        setSaving(false);
        return;
      }
      setName("");
      setPrice("");
      setDescription("");
      setBenefitsText("");
      setSaving(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tiers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete tier");
        setDeletingId(null);
        return;
      }
      setDeletingId(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {tiers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {tiers.map((tier) => (
            <div key={tier.id} className="kofi-card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{tier.name}</h3>
                  <p className="text-sm text-muted">{formatUsd(tier.priceCents)}/mo</p>
                </div>
                {typeof tier.memberCount === "number" ? (
                  <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
                    {tier.memberCount} {tier.memberCount === 1 ? "member" : "members"}
                  </span>
                ) : null}
              </div>

              {tier.description ? (
                <p className="mt-2 text-sm text-muted">{tier.description}</p>
              ) : null}

              {tier.benefits.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm">
                  {tier.benefits.map((benefit, i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="h-4 w-4 shrink-0 text-positive" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-4 self-start">
                <Button
                  type="button"
                  size="2"
                  variant="surface"
                  color="gray"
                  onClick={() => onDelete(tier.id)}
                  disabled={deletingId === tier.id}
                >
                  {deletingId === tier.id ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="kofi-card p-6 text-sm text-muted">
          No tiers yet. Add your first membership tier below.
        </div>
      )}

      <form onSubmit={onSubmit} className="kofi-card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Add a tier</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="tier-name">
              Tier name
            </label>
            <TextField.Root size="3">
              <TextField.Input
                id="tier-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Coffee Club"
                required
                maxLength={60}
              />
            </TextField.Root>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="tier-price">
              Monthly price (USD)
            </label>
            <TextField.Root size="3">
              <TextField.Slot>$</TextField.Slot>
              <TextField.Input
                id="tier-price"
                type="number"
                min="1"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="5"
                required
              />
            </TextField.Root>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="tier-description">
            Description <span className="font-normal text-muted">(optional)</span>
          </label>
          <TextArea
            id="tier-description"
            size="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="What this tier is about."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="tier-benefits">
            Benefits <span className="font-normal text-muted">(one per line)</span>
          </label>
          <TextArea
            id="tier-benefits"
            size="3"
            value={benefitsText}
            onChange={(e) => setBenefitsText(e.target.value)}
            rows={4}
            placeholder={"Supporter-only posts\nDiscord access\nMonthly wallpaper"}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" size="3" variant="solid" disabled={saving}>
          {saving ? "Adding…" : "Add tier"}
        </Button>
      </form>
    </div>
  );
}
