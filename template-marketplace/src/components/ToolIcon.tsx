import {
  Code2,
  FileText,
  Package,
  Presentation,
  Sparkles,
  Table2,
} from "lucide-react";
import type { Tool } from "@/generated/prisma/client";

interface ToolIconProps {
  tool: Tool;
  className?: string;
  style?: React.CSSProperties;
}

export function ToolIcon({ tool, className, style }: ToolIconProps) {
  switch (tool) {
    case "NOTION":
      return <NotionGlyph className={className} style={style} />;
    case "FIGMA":
      return <FigmaGlyph className={className} style={style} />;
    case "WEBFLOW":
      return <WebflowGlyph className={className} style={style} />;
    case "FRAMER":
      return <FramerGlyph className={className} style={style} />;
    case "CODE":
      return <Code2 className={className} style={style} aria-hidden />;
    case "DOCX":
      return <FileText className={className} style={style} aria-hidden />;
    case "XLSX":
      return <Table2 className={className} style={style} aria-hidden />;
    case "PPTX":
      return <Presentation className={className} style={style} aria-hidden />;
    case "AI_PROMPT":
      return <Sparkles className={className} style={style} aria-hidden />;
    case "OTHER":
    default:
      return <Package className={className} style={style} aria-hidden />;
  }
}

interface GlyphProps {
  className?: string;
  style?: React.CSSProperties;
}

function NotionGlyph({ className, style }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      style={style}
    >
      <path d="M5.5 3.5h3l8 11V3.5h2.5v17h-3l-8-11v11H5.5z" />
    </svg>
  );
}

function FigmaGlyph({ className, style }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      style={style}
    >
      <path d="M9 3.5h3v5H9a2.5 2.5 0 010-5zM12 3.5h3a2.5 2.5 0 010 5h-3v-5zM9 8.5h3v5H9a2.5 2.5 0 010-5zM12 8.5h0a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM9 13.5a2.5 2.5 0 012.5 2.5v2.5A2.5 2.5 0 119 16v-2.5z" />
    </svg>
  );
}

function WebflowGlyph({ className, style }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      style={style}
    >
      <path d="M3 6h3.6l1.55 5.05L9.8 6h2.7l1.55 5.05L15.7 6H21l-3.9 12h-2.9l-1.7-5.6L10.7 18H7.8z" />
    </svg>
  );
}

function FramerGlyph({ className, style }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      style={style}
    >
      <path d="M6.5 3.5h11v6H12.5L17.5 15.5h-11v-6H12.5L6.5 3.5z" />
      <path d="M6.5 15.5h6v5z" />
    </svg>
  );
}
