/**
 * FEED-3: one shared formatter for view counts, upload age, and durations,
 * reused across the feed, search results, watch page, and channel pages so the
 * "1.2M views • 3 hours ago" line reads identically everywhere.
 */

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 1234 → "1.2K", 1200000 → "1.2M". */
export function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  return compact.format(n);
}

/** YouTube-style view label: "No views", "1 view", "1.2M views". */
export function formatViews(n: number): string {
  if (n === 0) return "No views";
  if (n === 1) return "1 view";
  return `${formatCompact(n)} views`;
}

/** "1.2K subscribers" / "1 subscriber" / "No subscribers". */
export function formatSubscribers(n: number): string {
  if (n === 0) return "No subscribers";
  if (n === 1) return "1 subscriber";
  return `${formatCompact(n)} subscribers`;
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 7, unit: "days" },
  { amount: 4.34524, unit: "weeks" },
  { amount: 12, unit: "months" },
  { amount: Number.POSITIVE_INFINITY, unit: "years" },
];

/** "3 hours ago", "2 days ago" — relative to now. */
export function formatTimeAgo(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  let duration = (value.getTime() - Date.now()) / 1000; // seconds, negative for past
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relative.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return relative.format(Math.round(duration), "years");
}

/** Seconds → "m:ss" (or "h:mm:ss" past an hour) for the thumbnail badge. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
