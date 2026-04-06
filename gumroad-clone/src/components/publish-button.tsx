// src/app/sell/products/[productId]/edit/publish-button.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";

export function PublishButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  async function handlePublish() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/sell/products/${productId}/publish`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to publish");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handlePublish}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-semibold text-white hover:bg-success/90 transition-colors disabled:opacity-50"
      >
        <Rocket className="h-4 w-4" />
        {loading ? "Publishing..." : "Publish"}
      </button>
      {error && (
        <div
          role="alert"
          className="absolute right-0 top-full z-10 mt-2 w-64 rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-xs text-error shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-1"
        >
          {error}
        </div>
      )}
    </div>
  );
}
