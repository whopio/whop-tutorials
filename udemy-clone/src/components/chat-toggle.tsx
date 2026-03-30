"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MessageCircle, X, Loader2 } from "lucide-react";

const ChatLive = dynamic(
  () => import("./course-chat-live").then((mod) => mod.CourseChatLive),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[var(--color-accent)] animate-spin" />
      </div>
    ),
  }
);

export function ChatToggle({
  channelId,
  companyId,
}: {
  channelId: string;
  companyId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-[var(--color-border)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-8 py-3 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] transition-colors"
      >
        <span className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Course Discussion
        </span>
        {open ? <X className="w-4 h-4" /> : null}
      </button>
      {open && (
        <div className="px-8 pb-6">
          <ChatLive channelId={channelId} companyId={companyId} />
        </div>
      )}
    </div>
  );
}
