/**
 * Deterministic engagement seeding for the demo:
 *  - Reader personas (separate from writers) so Like / StoryRead rows have
 *    real backing rows the API can query against.
 *  - Per-story like totals + read counts come from fixed arrays so each
 *    re-run lands on the same numbers (idempotent + reproducible).
 *  - StoryRead rows are spread across the previous 60 days so the partner-
 *    payout cron has data to crunch.
 */

export interface SeedReader {
  handle: string;
  name: string;
  email: string;
}

/**
 * 14 reader personas. Plain names, plain handles, no headlines/bios — they
 * exist only to back engagement rows. They won't show up in any UI surface
 * other than (theoretically) a "Liked by" tooltip if we ever build one.
 */
export const SEED_READERS: SeedReader[] = [
  { handle: "reader_avery", name: "Avery Lin", email: "avery@seed.storyline.local" },
  { handle: "reader_noah", name: "Noah Patel", email: "noah@seed.storyline.local" },
  { handle: "reader_sofia", name: "Sofia Reyes", email: "sofia@seed.storyline.local" },
  { handle: "reader_jonah", name: "Jonah Park", email: "jonah@seed.storyline.local" },
  { handle: "reader_amelia", name: "Amelia Brooks", email: "amelia@seed.storyline.local" },
  { handle: "reader_kenji", name: "Kenji Tanaka", email: "kenji@seed.storyline.local" },
  { handle: "reader_isla", name: "Isla Morgan", email: "isla@seed.storyline.local" },
  { handle: "reader_diego", name: "Diego Vargas", email: "diego@seed.storyline.local" },
  { handle: "reader_ruth", name: "Ruth Adler", email: "ruth@seed.storyline.local" },
  { handle: "reader_omar", name: "Omar Khouri", email: "omar@seed.storyline.local" },
  { handle: "reader_clara", name: "Clara Voss", email: "clara@seed.storyline.local" },
  { handle: "reader_thiago", name: "Thiago Nunes", email: "thiago@seed.storyline.local" },
  { handle: "reader_naomi", name: "Naomi Wells", email: "naomi@seed.storyline.local" },
  { handle: "reader_henrik", name: "Henrik Vogel", email: "henrik@seed.storyline.local" },
];

/**
 * Log-skewed like totals — most stories sit in the 20–80 range, a handful
 * pop into the 200s, one breakout near 340. Ordered to match SEED_STORIES.
 */
export const STORY_LIKE_TOTALS = [
  87, 312, 41, 56, 198, // Maya: crit lessons is the breakout
  124, 73, 48, 29, 187, // Tom
  338, 156, 64, 38,     // Priya: revenue post breaks out
  221, 52, 71, 33,      // James
  142, 89, 244, 47,     // Eleni: sleep is the breakout
  68, 51, 109,          // Marcus
];

/**
 * Reads per story (real `StoryRead` rows). Smaller than likes — capped at
 * SEED_READERS.length × 2 (some readers will count across 2 months).
 * Ordered to match SEED_STORIES.
 */
export const STORY_READ_COUNTS = [
  18, 25, 12, 14, 22, // Maya
  20, 16, 11, 9, 24,  // Tom
  28, 22, 13, 10,     // Priya
  26, 12, 15, 9,      // James
  19, 17, 23, 11,     // Eleni
  14, 13, 20,         // Marcus
];

/**
 * Cross-writer follow graph. Each handle follows the listed handles. Seed
 * writers get a small natural-looking follow network.
 */
export const WRITER_FOLLOWS: Record<string, string[]> = {
  mayachen:    ["tomwhitfield", "priyaraman"],
  tomwhitfield: ["mayachen", "jamesokafor"],
  priyaraman:  ["mayachen", "elenimarkou"],
  jamesokafor: ["tomwhitfield", "marcusliang"],
  elenimarkou: ["priyaraman", "marcusliang"],
  marcusliang: ["elenimarkou", "jamesokafor"],
};

/**
 * Two seed writers follow the real root operator so their profile doesn't
 * look empty when they sign in. (Looked up by username at seed time.)
 */
export const FOLLOW_ROOT_OPERATOR_FROM: string[] = ["mayachen", "elenimarkou"];

/* ─────────────────────── Helpers used by seed.ts ─────────────────────── */

/**
 * Tiny deterministic PRNG (mulberry32). Same input seed → same output sequence.
 * Used so re-runs of the seed produce stable Like / StoryRead distributions.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick `count` distinct items from `arr` using the supplied rng. */
export function sampleN<T>(arr: T[], count: number, rng: () => number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

/** YYYY-MM bucket for a given Date. */
export function monthBucketOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Produce a Date `daysAgo` days before `from`, with hours/minutes randomized
 * by the supplied rng so reads don't all land at midnight.
 */
export function dateDaysAgo(daysAgo: number, rng: () => number, from = new Date()): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(Math.floor(rng() * 24), Math.floor(rng() * 60), 0, 0);
  return d;
}
