"use client";

import dynamic from "next/dynamic";
import { MessageCircle, Lock } from "lucide-react";

interface CourseChatProps {
  channelId: string | null;
  companyId: string;
  isEnrolled: boolean;
}

function ChatBlurredMock() {
  return (
    <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-[var(--color-accent)]" />
        <span className="text-sm font-medium">Course Discussion</span>
      </div>
      <div className="relative">
        <div className="p-4 space-y-3 blur-sm select-none pointer-events-none" aria-hidden>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface-elevated)]" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-20 rounded bg-[var(--color-surface-elevated)]" />
              <div className="h-3 w-48 rounded bg-[var(--color-surface-elevated)]" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface-elevated)]" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-24 rounded bg-[var(--color-surface-elevated)]" />
              <div className="h-3 w-56 rounded bg-[var(--color-surface-elevated)]" />
              <div className="h-3 w-36 rounded bg-[var(--color-surface-elevated)]" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface-elevated)]" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-16 rounded bg-[var(--color-surface-elevated)]" />
              <div className="h-3 w-40 rounded bg-[var(--color-surface-elevated)]" />
            </div>
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-surface)]/80">
          <Lock className="w-5 h-5 text-[var(--color-text-secondary)] mb-2" />
          <p className="text-sm text-[var(--color-text-secondary)] font-medium">
            Enroll to join the discussion
          </p>
        </div>
      </div>
    </div>
  );
}

// Dynamically loaded to avoid SSR issues with Whop's browser-only SDK
const ChatLive = dynamic(
  () =>
    import("./course-chat-live").then((mod) => mod.CourseChatLive),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[var(--color-accent)]" />
          <span className="text-sm font-medium">Course Discussion</span>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-sm text-[var(--color-text-secondary)]">Loading chat...</p>
        </div>
      </div>
    ),
  }
);

export function CourseChat({ channelId, companyId, isEnrolled }: CourseChatProps) {
  if (!channelId) return null;
  if (!isEnrolled) return <ChatBlurredMock />;
  return <ChatLive channelId={channelId} companyId={companyId} />;
}
