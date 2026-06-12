"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@whop/react/components";

// Ko-fi's discovery model: you find a creator by their handle, then land on
// their page. No global index, just "go to cuppa.com/<handle>".
export default function CreatorSearch({ placeholder = "creator-handle" }: { placeholder?: string }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean) router.push(`/${clean}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 focus-within:border-brand"
    >
      <span className="shrink-0 text-sm text-muted">cuppa.com/</span>
      <input
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-label="Find a creator by their handle"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
      <Button type="submit" size="2" variant="solid" color="gray" highContrast className="shrink-0">
        Go
      </Button>
    </form>
  );
}
