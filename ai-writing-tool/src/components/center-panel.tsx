"use client";

import { useApp } from "./app-shell";
import { GenerationOutput } from "./generation-output";
import { RefinementChat } from "./refinement-chat";

interface GenerationData {
  id: string;
  title: string;
  output: string;
  templateName: string;
  messages: { id: string; role: "USER" | "ASSISTANT"; content: string }[];
}

export function CenterPanel({
  generations,
}: {
  generations: Map<string, GenerationData>;
}) {
  const { selectedGenerationId } = useApp();
  const generation = selectedGenerationId
    ? generations.get(selectedGenerationId)
    : null;

  if (!generation) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center px-8">
        <div className="max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-text-muted mb-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
          <h2 className="text-lg font-semibold text-text-primary">
            AI Writing Studio
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Pick a template from the right sidebar to generate content. Your previous generations appear on the left.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-3">
        <h2 className="text-sm font-medium text-text-primary">{generation.title}</h2>
        <p className="text-xs text-text-muted">{generation.templateName}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <GenerationOutput content={generation.output} />
        <RefinementChat
          generationId={generation.id}
          existingMessages={generation.messages}
        />
      </div>
    </div>
  );
}
