import { channels, demoUsers } from "@/constants/whop-ids";
import { ChatPanel } from "@/components/ChatPanel";

export default function ChatPage() {
  const me = demoUsers[0];
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-lg font-semibold">General</h1>
      <div className="mt-4 h-[600px] overflow-hidden rounded-xl border border-gray-200 bg-white">
        <ChatPanel
          channelId={channels.general.id}
          userId={me.userId}
          userName={me.name}
        />
      </div>
    </main>
  );
}
