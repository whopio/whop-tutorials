/**
 * Seed writer personas. Each writer becomes a User + WriterProfile pair so
 * paid stories work. They aren't real Whop users — their whopUserId /
 * whopCompanyId are synthetic `seed_*` strings that won't collide with anything
 * Whop hands us. They cannot sign in; they only author stories.
 */

export interface SeedWriter {
  /** Used as username (case-sensitive). */
  handle: string;
  name: string;
  email: string;
  headline: string;
  bio: string;
}

export const SEED_WRITERS: SeedWriter[] = [
  {
    handle: "mayachen",
    name: "Maya Chen",
    email: "maya@seed.storyline.local",
    headline: "Designing systems that age well.",
    bio: "Senior product designer at a payments company. Writing about systems thinking, design tokens, and the craft of making interfaces that survive five product cycles.",
  },
  {
    handle: "tomwhitfield",
    name: "Tom Whitfield",
    email: "tom@seed.storyline.local",
    headline: "Engineering leadership, from the trenches.",
    bio: "Independent consultant. Previously engineering lead at an infra startup. Writing about technical leadership, code review, and the small habits that compound across a team.",
  },
  {
    handle: "priyaraman",
    name: "Priya Raman",
    email: "priya@seed.storyline.local",
    headline: "Building a one-person business in public.",
    bio: "Solo founder of a small profitable SaaS. Sharing the spreadsheets, the embarrassing failures, and the slow distribution wins that come from writing every week.",
  },
  {
    handle: "jamesokafor",
    name: "James Okafor",
    email: "james@seed.storyline.local",
    headline: "Frameworks for the work that matters.",
    bio: "Ex-management consultant. Now writing and coaching senior individual contributors through the in-between moments of a career — the promotions, the pivots, and the quiet weeks in between.",
  },
  {
    handle: "elenimarkou",
    name: "Eleni Markou",
    email: "eleni@seed.storyline.local",
    headline: "Science you can use this week.",
    bio: "Materials researcher turned science journalist. Translating peer-reviewed work on energy, climate adaptation, and everyday materials into things you can act on without a PhD.",
  },
  {
    handle: "marcusliang",
    name: "Marcus Liang",
    email: "marcus@seed.storyline.local",
    headline: "Pacing, craft, and the long miles.",
    bio: "Cultural critic and amateur ultrarunner. Writing about the structural craft of albums, films, and athletic discipline — and what each one teaches the others.",
  },
];

export const SEED_WRITERS_BY_HANDLE = Object.fromEntries(
  SEED_WRITERS.map((w) => [w.handle, w]),
) as Record<string, SeedWriter>;
