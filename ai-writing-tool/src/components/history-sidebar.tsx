"use client";

import { useApp } from "./app-shell";

interface GenerationItem {
  id: string;
  title: string;
  templateName: string;
  createdAt: string;
}

export function HistorySidebar({
  generations,
}: {
  generations: GenerationItem[];
}) {
  const { selectedGenerationId, selectGeneration } = useApp();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          History
        </h2>
      </div>
      {generations.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-xs text-text-muted text-center">
            No generations yet. Pick a template to get started.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {generations.map((g) => (
            <button
              key={g.id}
              onClick={() => selectGeneration(g.id)}
              className={`w-full px-4 py-2.5 text-left transition-colors cursor-pointer ${
                selectedGenerationId === g.id
                  ? "bg-surface-active border-l-2 border-accent"
                  : "hover:bg-surface-hover border-l-2 border-transparent"
              }`}
            >
              <p className={`text-sm truncate ${
                selectedGenerationId === g.id
                  ? "text-text-primary font-medium"
                  : "text-text-secondary"
              }`}>
                {g.title}
              </p>
              <p className="mt-0.5 text-xs text-text-muted truncate">
                {g.templateName}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
