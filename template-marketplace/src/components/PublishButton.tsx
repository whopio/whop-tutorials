"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublishButton({
  templateId,
  alreadyPublished,
}: {
  templateId: string;
  alreadyPublished: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[] | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  async function publish() {
    setPending(true);
    setError(null);
    setIssues(null);
    setDetail(null);
    try {
      const res = await fetch(
        `/api/sell/templates/${templateId}/publish`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        if (body && typeof body === "object" && "issues" in body && Array.isArray(body.issues)) {
          setIssues(body.issues as string[]);
        }
        if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") {
          setDetail(body.detail);
        }
        setError(
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : `Publish failed (${res.status})`,
        );
        setPending(false);
        return;
      }
      router.refresh();
      setPending(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={publish}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Publishing…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {alreadyPublished ? "Republish" : "Publish"}
          </>
        )}
      </button>

      {(error || issues) && (
        <div role="alert" className="max-w-xl rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
          {error && <div className="font-medium">{error}</div>}
          {issues && issues.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs">
              {issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
          {detail && (
            <pre className="mt-2 whitespace-pre-wrap break-all text-xs opacity-80">
              {detail}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
