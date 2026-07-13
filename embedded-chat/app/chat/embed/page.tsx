import { channels, demoUsers } from "@/constants/whop-ids";
import { ChatStage } from "@/components/ChatStage";

export default function ChatEmbedPage() {
  const me = demoUsers[0];
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-lg font-semibold">General, through the chat element</h1>
      <div className="mt-4 h-[600px] overflow-hidden rounded-xl border border-gray-200 bg-white">
        <ChatStage userId={me.userId} channelId={channels.general.id} />
      </div>
    </main>
  );
}
