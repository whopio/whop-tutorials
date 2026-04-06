// src/app/sell/products/[productId]/edit/delete-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleDelete() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sell/products/${productId}`, {
        method: "DELETE",
      });
      if (res.ok) router.push("/sell/dashboard");
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-error transition-colors disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
      {loading ? "..." : confirm ? "Confirm delete?" : "Delete"}
    </button>
  );
}
