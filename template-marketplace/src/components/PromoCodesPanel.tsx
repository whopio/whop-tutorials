"use client";

import { Info, Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

interface PromoCode {
  id: string;
  code: string | null;
  promo_type: "percentage" | "flat_amount";
  amount_off: number;
  status: "active" | "inactive" | "archived";
  stock: number;
  unlimited_stock: boolean;
  uses: number;
  expires_at: string | null;
  one_per_customer: boolean;
}

export function PromoCodesPanel({
  templateId,
  isPublished,
}: {
  templateId: string;
  isPublished: boolean;
}) {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    if (!isPublished) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sell/templates/${templateId}/promo-codes`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : `Request failed (${res.status})`,
        );
        return;
      }
      setCodes((body && typeof body === "object" && "codes" in body
        ? (body.codes as PromoCode[])
        : []) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isPublished) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sell/templates/${templateId}/promo-codes`);
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(
            body && typeof body === "object" && "error" in body && typeof body.error === "string"
              ? body.error
              : `Request failed (${res.status})`,
          );
          return;
        }
        setCodes((body && typeof body === "object" && "codes" in body
          ? (body.codes as PromoCode[])
          : []) ?? []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [templateId, isPublished]);

  if (!isPublished) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-6 text-center">
        <Tag className="mx-auto h-5 w-5 text-[var(--color-text-secondary)]" />
        <p className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">
          Publish first to issue codes
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Promo codes attach to the Whop product created on publish.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-accent-subtle)] p-3 text-xs text-[var(--color-text-secondary)]">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--color-accent)]" />
        <p>
          Promo discounts come out of <strong className="text-[var(--color-text-primary)]">your</strong> revenue, not the
          5% platform fee. To give the template away free, set its price to{" "}
          <strong className="text-[var(--color-text-primary)]">$0</strong> instead of issuing a 100%-off code.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-xs text-[var(--color-error)]">
          {error}
        </p>
      )}

      {loading && codes.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Loading codes…</p>
      ) : codes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">No promo codes yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {codes.map((c) => (
            <CodeRow key={c.id} code={c} templateId={templateId} onChange={refresh} />
          ))}
        </ul>
      )}

      {showForm ? (
        <CreateCodeForm
          templateId={templateId}
          onCancel={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            void refresh();
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-elevated)]"
        >
          <Plus className="h-4 w-4" />
          New code
        </button>
      )}
    </div>
  );
}

function CodeRow({
  code,
  templateId,
  onChange,
}: {
  code: PromoCode;
  templateId: string;
  onChange: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const stockLabel = code.unlimited_stock ? "∞" : `${code.stock}`;
  const amountLabel =
    code.promo_type === "percentage"
      ? `${code.amount_off}% off`
      : `$${code.amount_off.toFixed(2)} off`;
  const expiresLabel = code.expires_at
    ? new Date(code.expires_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Never";

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <code className="rounded bg-[var(--color-surface-elevated)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--color-text-primary)]">
            {code.code}
          </code>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              code.status === "active"
                ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                : "bg-[var(--color-text-secondary)]/15 text-[var(--color-text-secondary)]"
            }`}
          >
            {code.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {amountLabel} · {code.uses}/{stockLabel} uses · expires {expiresLabel}
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Archive code ${code.code}?`)) return;
          startTransition(async () => {
            await fetch(
              `/api/sell/templates/${templateId}/promo-codes/${code.id}`,
              { method: "DELETE" },
            );
            onChange();
          });
        }}
        aria-label={`Archive code ${code.code}`}
        className="flex-shrink-0 rounded-md p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function CreateCodeForm({
  templateId,
  onCancel,
  onCreated,
}: {
  templateId: string;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [promoType, setPromoType] = useState<"percentage" | "flat_amount">("percentage");
  const [amountOff, setAmountOff] = useState("20");
  const [expiresAt, setExpiresAt] = useState("");
  const [stock, setStock] = useState("");
  const [onePerCustomer, setOnePerCustomer] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const stockNum = stock.trim() === "" ? null : parseInt(stock, 10);
      const expires =
        expiresAt.trim() === "" ? null : new Date(expiresAt).toISOString();
      const res = await fetch(`/api/sell/templates/${templateId}/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          promoType,
          amountOff: parseFloat(amountOff),
          expiresAt: expires,
          stock: stockNum,
          onePerCustomer,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : `Request failed (${res.status})`,
        );
        setPending(false);
        return;
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">New promo code</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Code">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="LAUNCH20"
            maxLength={40}
            className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm uppercase text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
          />
        </Field>

        <Field label="Type">
          <select
            value={promoType}
            onChange={(e) =>
              setPromoType(e.target.value as "percentage" | "flat_amount")
            }
            className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
          >
            <option value="percentage">Percentage</option>
            <option value="flat_amount">Flat amount</option>
          </select>
        </Field>

        <Field label={promoType === "percentage" ? "Percent off" : "Dollars off"}>
          <input
            type="number"
            step={promoType === "percentage" ? "1" : "0.01"}
            min="0"
            max={promoType === "percentage" ? "99" : undefined}
            value={amountOff}
            onChange={(e) => setAmountOff(e.target.value)}
            className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
          />
        </Field>

        <Field label="Expires (optional)">
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
          />
        </Field>

        <Field label="Stock (optional)" helper="Blank = unlimited">
          <input
            type="number"
            min="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Unlimited"
            className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
          />
        </Field>

        <label className="flex items-center gap-2 self-end pb-2 text-sm text-[var(--color-text-primary)]">
          <input
            type="checkbox"
            checked={onePerCustomer}
            onChange={(e) => setOnePerCustomer(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus-visible:ring-[var(--color-accent)]"
          />
          One per customer
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-xs text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-elevated)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !code.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            "Create code"
          )}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-[var(--color-text-primary)]">{label}</span>
        {helper && (
          <span className="text-[10px] text-[var(--color-text-secondary)]">{helper}</span>
        )}
      </div>
      {children}
    </label>
  );
}
