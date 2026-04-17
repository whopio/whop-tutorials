import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export function getModel(modelId: string): LanguageModel {
  if (modelId.startsWith("claude")) return anthropic(modelId);
  if (modelId.startsWith("gpt")) return openai(modelId);
  throw new Error(`Unknown model: ${modelId}`);
}

export function buildPrompt(
  systemPrompt: string,
  inputs: Record<string, string>,
  inputFields: { name: string; label: string }[]
): string {
  const inputSection = inputFields
    .map((field) => `**${field.label}:** ${inputs[field.name] || "Not provided"}`)
    .join("\n");

  return `${systemPrompt}\n\nThe user has provided the following inputs:\n\n${inputSection}\n\nGenerate the content based on these inputs.`;
}
