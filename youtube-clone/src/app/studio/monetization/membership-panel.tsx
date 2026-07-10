"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createTier } from "./membership-actions";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
};

export function MembershipsPanel({ tiers }: { tiers: Tier[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(tiers.length === 0);

  function add() {
    setError(null);
    const dollars = Number.parseFloat(price);
    if (!name.trim() || !Number.isFinite(dollars) || dollars < 1) {
      setError("Add a tier name and a monthly price of at least $1.");
      return;
    }
    startTransition(async () => {
      const res = await createTier({
        name,
        description,
        priceCents: Math.round(dollars * 100),
      });
      if ("error" in res) {
        setError(res.error);
      } else {
        setName("");
        setPrice("");
        setDescription("");
        setShowForm(false);
        router.refresh();
      }
    });
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-accent";

  return (
    <div className="max-w-lg rounded-2xl border border-border p-6">
      <h2 className="text-lg font-bold">Channel memberships</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Offer monthly tiers. Viewers join through Whop; you&apos;re the merchant
        of record and we keep a small platform fee on each charge.
      </p>

      {tiers.length > 0 ? (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
          {tiers.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium">{t.name}</p>
                {t.description ? (
                  <p className="truncate text-xs text-fg-muted">
                    {t.description}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm font-medium">
                ${(t.priceCents / 100).toFixed(2)}/mo
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {showForm ? (
        <div className="mt-4 flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tier name (e.g. Supporter)"
            maxLength={50}
            className={inputClass}
          />
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            min="1"
            step="1"
            placeholder="Monthly price (USD)"
            className={inputClass}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Perks (optional)"
            maxLength={500}
            className={inputClass}
          />
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              disabled={pending}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Creating…" : "Create tier"}
            </button>
            {tiers.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-hover"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-hover"
        >
          <Plus className="h-4 w-4" />
          Add a tier
        </button>
      )}
    </div>
  );
}
