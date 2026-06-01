"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { CoverImagePicker } from "./CoverImagePicker";
import { TopicsPicker, type TopicOption } from "./TopicsPicker";
import { cn } from "@/lib/utils";

interface Props {
  storyId: string;
  initialCoverUrl: string | null;
  initialTopicSlugs: string[];
  topicOptions: TopicOption[];
  hasPaywallBreak: boolean;
  onClose: () => void;
}

export function PublishDialog({
  storyId,
  initialCoverUrl,
  initialTopicSlugs,
  topicOptions,
  hasPaywallBreak,
  onClose,
}: Props) {
  const router = useRouter();
  const [cover, setCover] = useState<{ url: string; key: string } | null>(
    initialCoverUrl ? { url: initialCoverUrl, key: "" } : null,
  );
  const [topics, setTopics] = useState<string[]>(initialTopicSlugs);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setSubmitting(true);
    setError(null);
    try {
      // First persist any cover/topic changes
      const patchRes = await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverImageUrl: cover?.url ?? null,
          coverImageKey: cover?.key ?? null,
          topicSlugs: topics,
        }),
      });
      if (!patchRes.ok) throw new Error("Could not save story details");

      const pubRes = await fetch(`/api/stories/${storyId}/publish`, { method: "POST" });
      if (!pubRes.ok) {
        const data = (await pubRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Could not publish");
      }
      router.refresh();
      router.push("/me/stories?published=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Publish story"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full sm:max-w-[560px] max-h-[90vh] sm:max-h-[85vh]",
          "bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-base sm:text-lg">Publish story</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 -mr-1 hover:bg-surface rounded-full"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <section>
            <h3 className="text-sm font-medium text-text-secondary mb-2">Cover image</h3>
            <CoverImagePicker
              url={cover?.url ?? null}
              onChange={(next) => setCover(next)}
            />
          </section>

          <section>
            <h3 className="text-sm font-medium text-text-secondary mb-2">Topics</h3>
            <TopicsPicker
              options={topicOptions}
              selected={topics}
              onChange={setTopics}
              max={5}
            />
          </section>

          <section className="text-sm text-text-secondary">
            <p>
              {hasPaywallBreak
                ? "This story has a paywall break — it will be published as a Plus story."
                : "This story is free to read."}
            </p>
          </section>

          {error && (
            <div role="alert" className="px-4 py-3 bg-error/10 text-error text-sm rounded-md border border-error/30">
              {error}
            </div>
          )}
        </div>

        <footer className="px-5 py-4 border-t border-border shrink-0 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-pill border border-border text-sm hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={submitting}
            className="px-5 py-2 rounded-pill bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-50"
          >
            {submitting ? "Publishing…" : "Publish now"}
          </button>
        </footer>
      </div>
    </div>
  );
}
