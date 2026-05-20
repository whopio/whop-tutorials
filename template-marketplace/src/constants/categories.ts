import type { Tool, Category } from "@/generated/prisma/client";

export const TOOLS: ReadonlyArray<{
  value: Tool;
  label: string;
  cssVar: string;
  description: string;
  group: "clone" | "file";
}> = [
  // Clone-URL tools
  { value: "NOTION", label: "Notion", cssVar: "--color-tool-notion", description: "Notion duplicate URLs", group: "clone" },
  { value: "FIGMA", label: "Figma", cssVar: "--color-tool-figma", description: "Figma community files", group: "clone" },
  { value: "WEBFLOW", label: "Webflow", cssVar: "--color-tool-webflow", description: "Webflow site clones", group: "clone" },
  { value: "FRAMER", label: "Framer", cssVar: "--color-tool-framer", description: "Framer remix URLs", group: "clone" },
  { value: "WORDPRESS", label: "WordPress", cssVar: "--color-tool-wordpress", description: "WordPress themes and templates", group: "file" },
  // File-download tools
  { value: "CODE", label: "Code", cssVar: "--color-tool-code", description: "Project starters and boilerplates", group: "file" },
  { value: "DOCX", label: "Word", cssVar: "--color-tool-docx", description: "Word / Google Docs templates", group: "file" },
  { value: "XLSX", label: "Excel", cssVar: "--color-tool-xlsx", description: "Excel / Google Sheets templates", group: "file" },
  { value: "PPTX", label: "PowerPoint", cssVar: "--color-tool-pptx", description: "PowerPoint / Keynote decks", group: "file" },
  { value: "AI_PROMPT", label: "AI Prompt", cssVar: "--color-tool-ai-prompt", description: "Cursor rules, GPT instructions, Claude prompts", group: "file" },
  { value: "OTHER", label: "Other", cssVar: "--color-tool-other", description: "Anything else", group: "file" },
];

export const CATEGORIES: ReadonlyArray<{ value: Category; label: string }> = [
  { value: "PRODUCTIVITY", label: "Productivity" },
  { value: "PROJECT_MANAGEMENT", label: "Project management" },
  { value: "LANDING_PAGES", label: "Landing pages" },
  { value: "DASHBOARDS", label: "Dashboards" },
  { value: "BRANDING", label: "Branding" },
  { value: "DEV_BOILERPLATES", label: "Dev boilerplates" },
  { value: "MARKETING", label: "Marketing" },
  { value: "FINANCE", label: "Finance" },
  { value: "OTHER", label: "Other" },
];

export function toolByValue(value: Tool) {
  return TOOLS.find((t) => t.value === value) ?? TOOLS[TOOLS.length - 1];
}

export function categoryByValue(value: Category) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}
