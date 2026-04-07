// src/app/sell/products/[productId]/edit/unpublish-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff } from "lucide-react";

export function UnpublishButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleUnpublish() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sell/products/${productId}/unpublish`, {
        method: "POST",
      });
      if (res.ok) router.refresh();
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  }

  return (
    <button
      onClick={handleUnpublish}
      disabled={loading}
      className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-warning transition-colors disabled:opacity-50"
    >
      <EyeOff className="h-4 w-4" />
      {loading ? "..." : confirm ? "Confirm?" : "Unpublish"}
    </button>
  );
}
