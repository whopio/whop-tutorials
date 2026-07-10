import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaySquare } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { getLikedVideos, getWatchLater } from "@/lib/library";
import { getPlaylistDetail } from "@/lib/playlists";
import { VideoGrid } from "@/components/feed/video-grid";
import {
  DeletePlaylistButton,
  PlaylistView,
} from "@/components/playlist/playlist-view";

type SearchParams = Promise<{ list?: string | string[] }>;

const listId = (list: string | string[] | undefined) =>
  Array.isArray(list) ? list[0] : list;

// The two system playlists (owner-only). User playlists (LIB-9..12) resolve by id.
const SYSTEM = {
  WL: {
    title: "Watch later",
    load: getWatchLater,
    empty: "Videos you save will show up here.",
  },
  LL: {
    title: "Liked videos",
    load: getLikedVideos,
    empty: "Videos you like will show up here.",
  },
} as const;

const VIS_LABEL: Record<string, string> = {
  PUBLIC: "Public",
  UNLISTED: "Unlisted",
  PRIVATE: "Private",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const list = listId((await searchParams).list);
  if (list === "WL" || list === "LL") {
    return { title: `${SYSTEM[list].title} - Wavora` };
  }
  if (list) {
    const detail = await getPlaylistDetail(list, null);
    if (detail) return { title: `${detail.title} - Wavora` };
  }
  return { title: "Playlist - Wavora" };
}

export default async function PlaylistPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const list = listId((await searchParams).list);
  if (!list) notFound();

  // System playlists: Watch later / Liked videos.
  if (list === "WL" || list === "LL") {
    const meta = SYSTEM[list];
    const user = await requireUser();
    const videos = await meta.load(user.id);
    return (
      <div className="mx-auto max-w-[2400px]">
        <h1 className="mb-6 text-2xl font-bold">{meta.title}</h1>
        {videos.length > 0 ? (
          <VideoGrid videos={videos} />
        ) : (
          <p className="py-16 text-center text-sm text-fg-muted">
            {meta.empty}
          </p>
        )}
      </div>
    );
  }

  // User-created playlist.
  const viewer = await getCurrentUser();
  const detail = await getPlaylistDetail(list, viewer?.id ?? null);
  if (!detail) notFound();

  const cover = detail.videos[0];

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6 lg:flex-row">
      <aside className="lg:w-80 lg:shrink-0">
        <div className="rounded-2xl bg-surface p-5">
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-hover">
            {cover?.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <h1 className="mt-4 text-xl font-bold">{detail.title}</h1>
          <p className="mt-1 text-sm text-fg-muted">{detail.ownerName}</p>
          <p className="text-xs text-fg-muted">
            {detail.videos.length} video{detail.videos.length === 1 ? "" : "s"}
            {" • "}
            {VIS_LABEL[detail.visibility]}
          </p>
          {detail.description ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-fg-muted">
              {detail.description}
            </p>
          ) : null}
          {cover ? (
            <Link
              href={`/watch?v=${cover.id}`}
              className="mt-4 flex items-center justify-center gap-2 rounded-full bg-fg px-4 py-2.5 text-sm font-medium text-canvas hover:opacity-90"
            >
              <PlaySquare className="h-5 w-5" /> Play
            </Link>
          ) : null}
          {detail.isOwner ? <DeletePlaylistButton id={detail.id} /> : null}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <PlaylistView
          playlistId={detail.id}
          videos={detail.videos}
          isOwner={detail.isOwner}
        />
      </div>
    </div>
  );
}
