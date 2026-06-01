"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface PromoCodeRow {
  id: string;
  code: string;
  discountPercent: number;
  validUntil: string | null;
  maxUses: number | null;
  usageCount: number;
  createdByUsername: string | null;
  createdAt: string;
  archived: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function PromoCodesManager({ initial }: { initial: PromoCodeRow[] }) {
  const router = useRouter();
  const [rows] = useState(initial);
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("20");
  const [validUntil, setValidUntil] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(async () => {
      const body: Record<string, unknown> = {
        code: code.trim(),
        discountPercent: Number(discountPercent),
      };
      if (validUntil) body.validUntil = new Date(validUntil).toISOString();
      if (maxUses) body.maxUses = Number(maxUses);

      const res = await fetch("/api/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create");
        return;
      }
      setCode("");
      setMaxUses("");
      setValidUntil("");
      router.refresh();
    });
  }

  function archive(id: string) {
    if (!window.confirm("Archive this code? It can no longer be redeemed.")) return;
    startTransition(async () => {
      const res = await fetch(`/api/promo-codes/${id}/archive`, { method: "POST" });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="mt-8 space-y-10">
      <section>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
          Create new
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Code"
            value={code}
            onChange={setCode}
            placeholder="LAUNCH20"
            transform="uppercase"
          />
          <Input
            label="Discount (%)"
            value={discountPercent}
            onChange={setDiscountPercent}
            type="number"
            min="1"
            max="100"
          />
          <Input
            label="Valid until (optional)"
            value={validUntil}
            onChange={setValidUntil}
            type="date"
          />
          <Input
            label="Max uses (optional)"
            value={maxUses}
            onChange={setMaxUses}
            type="number"
            min="1"
            placeholder="Unlimited"
          />
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-error">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={create}
          disabled={!code || !discountPercent || isPending}
          className="mt-4 px-4 py-2.5 rounded-pill bg-text-primary text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create promo code"}
        </button>
      </section>

      <section>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
          All codes ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="text-text-secondary text-sm">No promo codes yet.</p>
        ) : (
          <ul className="border-t border-border">
            {rows.map((c) => (
              <li
                key={c.id}
                className="py-4 flex items-center justify-between gap-3 border-b border-border last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-semibold text-text-primary">{c.code}</code>
                    <span className="text-sm text-text-secondary">{c.discountPercent}% off</span>
                    {c.archived && (
                      <span className="text-xs px-2 py-0.5 rounded-pill bg-surface text-text-tertiary">
                        archived
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">
                    {c.usageCount} {c.maxUses ? `/ ${c.maxUses}` : ""} uses
                    {c.validUntil && ` · expires ${formatDate(c.validUntil)}`}
                    {c.createdByUsername && ` · by @${c.createdByUsername}`}
                  </div>
                </div>
                {!c.archived && (
                  <button
                    type="button"
                    onClick={() => archive(c.id)}
                    className="text-sm text-error hover:text-error/80"
                  >
                    Archive
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
  transform,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  transform?: "uppercase";
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-text-secondary block mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(transform === "uppercase" ? e.target.value.toUpperCase() : e.target.value)
        }
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full px-3 py-2 rounded-md border border-border bg-background text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-primary"
      />
    </label>
  );
}
