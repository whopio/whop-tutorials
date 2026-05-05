import { HeroProfileCard } from "./HeroProfileCard";

// Decorative background for the homepage hero. Four mockup creator cards
// drift slowly via CSS keyframes (transform-only, GPU-composited). Each
// card uses one of our accent palette colors to advertise the per-creator
// theming feature. Hidden from screen readers because the foreground hero
// content already explains what the product does.

const SAMPLES = [
  {
    name: "Maya Chen",
    handle: "mayachen",
    bio: "Photographer. Light, color, and people you'll never meet.",
    accent: "crimson",
    freeLinks: ["Latest gallery", "Behind the scenes"],
    premium: { title: "Lightroom presets pack", price: 12 },
  },
  {
    name: "Daniel Park",
    handle: "danielpark",
    bio: "Producer making gentle electronics in Brooklyn.",
    accent: "indigo",
    freeLinks: ["Listen on Spotify", "Tour dates"],
    premium: { title: "Album rough mixes", price: 8 },
  },
  {
    name: "Lila Reyes",
    handle: "lilakitchen",
    bio: "Weeknight recipes that actually take 30 minutes.",
    accent: "tangerine",
    freeLinks: ["This week's recipe", "Newsletter"],
    premium: { title: "30-day meal plan", price: 15 },
  },
  {
    name: "Theo Brown",
    handle: "theobrown",
    bio: "Engineer. Writing about systems, simplicity, and side projects.",
    accent: "forest",
    freeLinks: ["GitHub", "Blog"],
    premium: { title: "Refactoring legacy course", price: 25 },
  },
] as const;

const POSITIONS = [
  // top-left, slightly behind the hero text
  {
    className: "left-[6%] top-[14%] hidden md:block hero-drift-a",
    style: {
      animation: "hero-drift-a 9s ease-in-out infinite",
    },
  },
  // top-right
  {
    className: "right-[8%] top-[8%] hero-drift-b",
    style: {
      animation: "hero-drift-b 11s ease-in-out infinite",
    },
  },
  // bottom-left
  {
    className: "left-[12%] bottom-[8%] hidden lg:block hero-drift-c",
    style: {
      animation: "hero-drift-c 10s ease-in-out infinite",
    },
  },
  // bottom-right, partially off-screen on smaller widths to feel layered
  {
    className: "right-[4%] bottom-[12%] hidden md:block hero-drift-d",
    style: {
      animation: "hero-drift-d 12s ease-in-out infinite",
    },
  },
] as const;

export function HeroFloatingCards() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {SAMPLES.map((sample, i) => {
        const pos = POSITIONS[i];
        return (
          <div
            key={sample.handle}
            className={`absolute opacity-90 ${pos.className}`}
            style={pos.style}
          >
            <HeroProfileCard {...sample} />
          </div>
        );
      })}
    </div>
  );
}
