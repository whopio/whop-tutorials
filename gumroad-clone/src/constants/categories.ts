import {
  FileText,
  BookOpen,
  Code,
  Palette,
  Music,
  Video,
  Camera,
  GraduationCap,
  Package,
  type LucideIcon,
} from "lucide-react";

export const CATEGORIES = [
  { value: "TEMPLATES", label: "Templates", icon: FileText },
  { value: "EBOOKS", label: "Ebooks", icon: BookOpen },
  { value: "SOFTWARE", label: "Software", icon: Code },
  { value: "DESIGN", label: "Design", icon: Palette },
  { value: "AUDIO", label: "Audio", icon: Music },
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "PHOTOGRAPHY", label: "Photography", icon: Camera },
  { value: "EDUCATION", label: "Education", icon: GraduationCap },
  { value: "OTHER", label: "Other", icon: Package },
] as const satisfies readonly { value: string; label: string; icon: LucideIcon }[];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
) as Record<string, (typeof CATEGORIES)[number]>;
