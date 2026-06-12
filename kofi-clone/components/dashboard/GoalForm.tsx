"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField, TextArea } from "@whop/react/components";

interface CreatorGoal {
  title: string;
  description: string;
  targetCents: number;
}

export default function GoalForm({ goal }: { goal: CreatorGoal | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [target, setTarget] = useState(goal ? String(goal.targetCents / 100) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const targetCents = Math.round(Number(target) * 100);
    if (!title.trim()) {
      setError("Give your goal a title.");
      return;
    }
    if (!Number.isFinite(targetCents) || targetCents < 100) {
      setError("Set a target of at least $1.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/creator/goal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          targetCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save goal");
        setSaving(false);
        return;
      }
      setSaved(true);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  async function onRemove() {
    setRemoving(true);
    setError(null);
    try {
      await fetch("/api/creator/goal", { method: "DELETE" });
      setTitle("");
      setDescription("");
      setTarget("");
      setSaved(false);
      router.refresh();
    } catch {
      setError("Could not remove goal");
    }
    setRemoving(false);
  }

  return (
    <form onSubmit={onSubmit} className="kofi-card space-y-5 p-6">
      <div>
        <h2 className="text-lg font-bold">Donation goal</h2>
        <p className="mt-1 text-sm text-muted">
          Show supporters what you&rsquo;re raising money for. Your progress is your total raised
          against the target, and a progress bar appears on your page.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="goal-title">
          Title
        </label>
        <TextField.Root size="3">
          <TextField.Input
            id="goal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="A new drawing tablet"
          />
        </TextField.Root>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="goal-target">
          Target amount <span className="font-normal text-muted">(USD)</span>
        </label>
        <TextField.Root size="3">
          <TextField.Input
            id="goal-target"
            type="number"
            min="1"
            step="1"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="500"
          />
        </TextField.Root>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="goal-desc">
          Description <span className="font-normal text-muted">(optional)</span>
        </label>
        <TextArea
          id="goal-desc"
          size="3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Tell supporters why it matters."
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm text-positive">Saved.</p> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" size="3" variant="solid" disabled={saving}>
          {saving ? "Saving…" : goal ? "Update goal" : "Set goal"}
        </Button>
        {goal ? (
          <Button type="button" size="3" variant="soft" color="gray" disabled={removing} onClick={onRemove}>
            {removing ? "Removing…" : "Remove"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
