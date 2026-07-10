import { getCurrentUser } from "@/lib/session";
import { getShortsFeed } from "@/lib/shorts";
import { ShortsFeed } from "@/components/shorts/shorts-feed";

export const metadata = { title: "Waves - Wavora" };

/** FEED-13: the Shorts surface. `?v=<id>` deep-links to a specific Short. */
export default async function ShortsPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  const { v } = await searchParams;
  const user = await getCurrentUser();
  const shorts = await getShortsFeed(
    user?.id ?? null,
    Array.isArray(v) ? v[0] : v,
  );

  return <ShortsFeed shorts={shorts} isSignedIn={Boolean(user)} />;
}
