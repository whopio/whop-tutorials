import { getChannelVideoCount, resolveChannel } from "@/lib/channels";

/** CHANNEL-9: the channel About tab — description, join date, video count. */
export default async function ChannelAboutPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const channel = await resolveChannel(handle);
  const count = await getChannelVideoCount(channel.id);
  const joined = new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(
    channel.createdAt,
  );

  return (
    <div className="max-w-2xl">
      <h2 className="mb-3 text-lg font-bold">About</h2>
      {channel.description ? (
        <p className="whitespace-pre-wrap text-sm">{channel.description}</p>
      ) : (
        <p className="text-sm text-fg-muted">No description provided.</p>
      )}
      <dl className="mt-6 space-y-1.5 text-sm text-fg-muted">
        <div>Joined {joined}</div>
        <div>
          {count} video{count === 1 ? "" : "s"}
        </div>
      </dl>
    </div>
  );
}
