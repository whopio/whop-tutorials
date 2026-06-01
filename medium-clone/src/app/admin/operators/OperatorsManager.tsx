"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface OperatorRow {
  id: string;
  email: string;
  isRoot: boolean;
  linkedUser: {
    id: string;
    username: string;
    name: string | null;
    avatar: string | null;
  } | null;
  addedByUsername: string | null;
  createdAt: string;
}

export function OperatorsManager({ initial }: { initial: OperatorRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function invite() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        pending?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not invite");
        return;
      }
      setEmail("");
      setInfo(
        data.pending
          ? "Invite saved. They'll get access the next time they sign in with this email."
          : "Operator added.",
      );
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!window.confirm("Remove this operator?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/operators/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-8">
      <section>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-2">
          Invite by email
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            aria-label="Operator email"
            className="flex-1 min-w-[220px] px-4 py-2.5 rounded-md border border-border bg-background text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-primary"
          />
          <button
            type="button"
            onClick={invite}
            disabled={!email || isPending}
            className="px-4 py-2.5 rounded-pill bg-text-primary text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
          >
            {isPending ? "Inviting…" : "Add operator"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-error">
            {error}
          </p>
        )}
        {info && <p className="mt-2 text-sm text-text-secondary">{info}</p>}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-2">
          Current operators ({rows.length})
        </h2>
        <ul className="border-t border-border">
          {rows.map((r) => (
            <li
              key={r.id}
              className="py-4 flex items-center justify-between gap-3 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                {r.linkedUser?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.linkedUser.avatar}
                    alt=""
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-9 rounded-full bg-surface" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <div className="font-medium text-text-primary truncate">
                    {r.linkedUser?.name ?? r.email}
                  </div>
                  <div className="text-xs text-text-tertiary truncate">
                    {r.linkedUser ? `@${r.linkedUser.username} · ${r.email}` : `${r.email} · pending`}
                    {r.isRoot && " · root"}
                  </div>
                </div>
              </div>
              {!r.isRoot && (
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="text-sm text-error hover:text-error/80"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
