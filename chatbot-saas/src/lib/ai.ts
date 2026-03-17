import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export const SUPPORTED_MODELS = [
  {
    id: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    provider: "anthropic" as const,
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "openai" as const,
  },
] as const;

export type SupportedModelId = (typeof SUPPORTED_MODELS)[number]["id"];

const DEFAULT_MODEL: SupportedModelId = "claude-haiku-4-5-20251001";

export function getModel(modelId?: string | null): LanguageModel {
  const id = modelId || DEFAULT_MODEL;
  const entry = SUPPORTED_MODELS.find((m) => m.id === id);
  if (!entry) {
    return anthropic(DEFAULT_MODEL);
  }
  switch (entry.provider) {
    case "anthropic":
      return anthropic(entry.id);
    case "openai":
      return openai(entry.id);
  }
}
