import { PublicationCategory } from "@/generated/prisma/browser";

export const CATEGORY_LABELS: Record<PublicationCategory, string> = {
  TECHNOLOGY: "Technology",
  BUSINESS: "Business",
  CULTURE: "Culture",
  POLITICS: "Politics",
  SCIENCE: "Science",
  HEALTH: "Health",
  FINANCE: "Finance",
  SPORTS: "Sports",
  FOOD: "Food",
  TRAVEL: "Travel",
  MUSIC: "Music",
  ART: "Art",
  EDUCATION: "Education",
  OTHER: "Other",
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(
  ([value, label]) => ({ value: value as PublicationCategory, label })
);
