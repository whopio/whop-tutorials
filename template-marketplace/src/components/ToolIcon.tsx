import { Code2, Package, Sparkles } from "lucide-react";
import type { Tool } from "@/generated/prisma/client";

interface ToolIconProps {
  tool: Tool;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Tool icons.
 *
 * For brand tools (Notion / Figma / Webflow / Framer / Word / Excel /
 * PowerPoint) we ship the official multi-color SVG from public/tool-icons/.
 * Those icons keep their own intrinsic colors and ignore the `style` color.
 *
 * For generic categories (Code / AI Prompt / Other) we use Lucide and the
 * `style` color is applied via `currentColor`.
 */
export function ToolIcon({ tool, className, style }: ToolIconProps) {
  const brand = BRAND_SVG[tool];
  if (brand) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.src}
        alt={brand.alt}
        className={className}
        style={{ objectFit: "contain" }}
        loading="lazy"
        decoding="async"
      />
    );
  }

  switch (tool) {
    case "CODE":
      return <Code2 className={className} style={style} aria-hidden />;
    case "AI_PROMPT":
      return <Sparkles className={className} style={style} aria-hidden />;
    case "OTHER":
    default:
      return <Package className={className} style={style} aria-hidden />;
  }
}

const BRAND_SVG: Partial<Record<Tool, { src: string; alt: string }>> = {
  NOTION: { src: "/tool-icons/notion.svg", alt: "Notion" },
  FIGMA: { src: "/tool-icons/figma.svg", alt: "Figma" },
  WEBFLOW: { src: "/tool-icons/webflow.svg", alt: "Webflow" },
  FRAMER: { src: "/tool-icons/framer.svg", alt: "Framer" },
  DOCX: { src: "/tool-icons/word.svg", alt: "Microsoft Word" },
  XLSX: { src: "/tool-icons/excel.svg", alt: "Microsoft Excel" },
  PPTX: { src: "/tool-icons/powerpoint.svg", alt: "Microsoft PowerPoint" },
};
