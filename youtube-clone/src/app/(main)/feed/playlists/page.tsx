import { requireUser } from "@/lib/auth";
import { getUserPlaylists } from "@/lib/playlists";
import { PlaylistCard } from "@/components/feed/playlist-card";

export const metadata = { title: "Playlists - Wavora" };

/** LIB-12: the viewer's playlists grid. */
export default async function PlaylistsPage() {
  const user = await requireUser();
  const playlists = await getUserPlaylists(user.id);

  return (
    <div className="mx-auto max-w-[1600px]">
      <h1 className="mb-6 text-2xl font-bold">Playlists</h1>
      {playlists.length === 0 ? (
        <p className="py-16 text-center text-sm text-fg-muted">
          Playlists you create will show up here. Use Save on any video.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {playlists.map((p) => (
            <PlaylistCard key={p.id} playlist={p} />
          ))}
        </div>
      )}
    </div>
  );
}
