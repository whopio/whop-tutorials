import raw from "@/constants/taxonomy.json";

// The full business taxonomy: 13 business types, 119 industry groups, 2,033
// industry types, taken from the glossary on the Account page and verified
// against the sandbox. Shipping the whole tree rather than a curated handful
// means every option in the dropdowns is one formation accepts.
export type Taxonomy = Record<string, Record<string, string[]>>;

export const TAXONOMY = raw as Taxonomy;

export const BUSINESS_TYPES = Object.keys(TAXONOMY);

export function groupsFor(businessType: string): string[] {
  return Object.keys(TAXONOMY[businessType] ?? {});
}

export function typesFor(businessType: string, group: string): string[] {
  return TAXONOMY[businessType]?.[group] ?? [];
}

// snake_case reads badly in a dropdown. "ai_chatbot_agency" becomes
// "Ai chatbot agency", which is close enough and needs no lookup table.
export function label(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
