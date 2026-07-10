"use client";

import { useState, useTransition } from "react";
import { ThumbsUp, MoreVertical, Heart, User } from "lucide-react";
import { formatCompact, formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  postComment,
  deleteComment,
  toggleCommentLike,
  heartComment,
  pinComment,
  moderateComment,
  toggleComments,
  fetchComments,
  loadReplies,
} from "@/lib/comment-actions";

type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    username: string;
    avatarUrl: string | null;
  };
  likeCount: number;
  myLiked: boolean;
  heartedByCreator: boolean;
  isPinned: boolean;
  replyCount: number;
  isOwn: boolean;
  authorIsMember: boolean;
  isSuperThanks: boolean;
  superThanksAmount: number | null;
};

function goSignIn() {
  window.location.href = `/sign-in?next=${encodeURIComponent(
    window.location.pathname + window.location.search,
  )}`;
}

function Avatar({ url, size = 40 }: { url: string | null; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-hover"
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <User className="h-1/2 w-1/2 text-fg-muted" />
      )}
    </span>
  );
}

function Composer({
  isSignedIn,
  onSubmit,
  placeholder = "Add a comment...",
  autoFocus = false,
  onCancel,
}: {
  isSignedIn: boolean;
  onSubmit: (body: string) => Promise<boolean>;
  placeholder?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!isSignedIn) return goSignIn();
    const text = body.trim();
    if (!text) return;
    startTransition(async () => {
      const ok = await onSubmit(text);
      if (ok) setBody("");
    });
  }

  return (
    <div className="min-w-0 flex-1">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={1}
        autoFocus={autoFocus}
        className="w-full resize-none border-b border-border bg-transparent pb-1 text-sm outline-none focus:border-fg"
      />
      <div className="mt-2 flex justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-3 py-1.5 text-sm hover:bg-hover"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-50"
        >
          Comment
        </button>
      </div>
    </div>
  );
}

function Kebab({
  items,
}: {
  items: { label: string; onClick: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Comment actions"
        onClick={() => setOpen((o) => !o)}
        className="grid h-8 w-8 place-items-center rounded-full hover:bg-hover"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
            {items.map((it) => (
              <button
                key={it.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className={cn(
                  "block w-full px-3 py-1.5 text-left text-sm hover:bg-hover",
                  it.danger && "text-red-500",
                )}
              >
                {it.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function CommentItem({
  comment,
  videoId,
  isSignedIn,
  isCreator,
  myAvatar,
  isReply = false,
  adjustCount,
  onRemoved,
}: {
  comment: CommentDTO;
  videoId: string;
  isSignedIn: boolean;
  isCreator: boolean;
  myAvatar: string | null;
  isReply?: boolean;
  adjustCount: (d: number) => void;
  onRemoved: (id: string, removedReplies: number) => void;
}) {
  const [liked, setLiked] = useState(comment.myLiked);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [hearted, setHearted] = useState(comment.heartedByCreator);
  const [pinned, setPinned] = useState(comment.isPinned);
  const [replying, setReplying] = useState(false);
  const [replies, setReplies] = useState<CommentDTO[]>([]);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replyCount, setReplyCount] = useState(comment.replyCount);
  const [, startTransition] = useTransition();

  function like() {
    if (!isSignedIn) return goSignIn();
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount(likeCount + (liked ? -1 : 1));
    startTransition(async () => {
      const res = await toggleCommentLike(comment.id);
      if ("error" in res) {
        setLiked(prevLiked);
        setLikeCount(prevCount);
      } else {
        setLiked(res.liked);
        setLikeCount(res.count);
      }
    });
  }

  async function showReplies() {
    setRepliesOpen(true);
    if (replies.length === 0) setReplies(await loadReplies(comment.id));
  }

  function removeReplyLocally(id: string) {
    setReplies((r) => r.filter((x) => x.id !== id));
    setReplyCount((n) => Math.max(0, n - 1));
    adjustCount(-1);
  }

  const items: { label: string; onClick: () => void; danger?: boolean }[] = [];
  if (comment.isOwn) {
    items.push({
      label: "Delete",
      danger: true,
      onClick: () => {
        if (!confirm("Delete this comment?")) return;
        startTransition(async () => {
          const res = await deleteComment(comment.id);
          if (!("error" in res)) onRemoved(comment.id, isReply ? 0 : replyCount);
        });
      },
    });
  }
  if (isCreator) {
    items.push({
      label: hearted ? "Remove heart" : "Heart",
      onClick: () =>
        startTransition(async () => {
          const res = await heartComment(comment.id);
          if (!("error" in res)) setHearted(res.hearted);
        }),
    });
    if (!isReply) {
      items.push({
        label: pinned ? "Unpin" : "Pin",
        onClick: () =>
          startTransition(async () => {
            const res = await pinComment(comment.id);
            if (!("error" in res)) setPinned(res.pinned);
          }),
      });
    }
    if (!comment.isOwn) {
      items.push({
        label: "Remove",
        danger: true,
        onClick: () =>
          startTransition(async () => {
            const res = await moderateComment(comment.id, "remove");
            if (!("error" in res))
              onRemoved(comment.id, isReply ? 0 : replyCount);
          }),
      });
    }
  }

  return (
    <div className="flex gap-3">
      <Avatar url={comment.author.avatarUrl} size={isReply ? 32 : 40} />
      <div className="min-w-0 flex-1">
        {pinned && !isReply ? (
          <p className="mb-0.5 text-xs text-fg-muted">Pinned</p>
        ) : null}
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium">
            {comment.author.name ?? `@${comment.author.username}`}
          </span>
          {comment.authorIsMember ? (
            <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
              Member
            </span>
          ) : null}
          {comment.isSuperThanks && comment.superThanksAmount ? (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
              ${(comment.superThanksAmount / 100).toFixed(2)}
            </span>
          ) : null}
          <span className="text-xs text-fg-muted">
            {formatTimeAgo(comment.createdAt)}
          </span>
          {hearted ? (
            <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
          ) : null}
        </div>
        <p
          className={cn(
            "mt-0.5 whitespace-pre-wrap break-words text-sm",
            comment.isSuperThanks && "rounded-lg bg-brand/10 px-3 py-2",
          )}
        >
          {comment.body}
        </p>

        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={like}
            className="flex items-center gap-1 text-fg-muted hover:text-fg"
          >
            <ThumbsUp className={cn("h-4 w-4", liked && "fill-current text-fg")} />
            {likeCount > 0 ? (
              <span className="text-xs">{formatCompact(likeCount)}</span>
            ) : null}
          </button>
          {!isReply ? (
            <button
              type="button"
              onClick={() => (isSignedIn ? setReplying(true) : goSignIn())}
              className="text-xs font-medium text-fg-muted hover:text-fg"
            >
              Reply
            </button>
          ) : null}
          <div className="ml-auto">
            <Kebab items={items} />
          </div>
        </div>

        {replying && !isReply ? (
          <div className="mt-2 flex gap-3">
            <Avatar url={myAvatar} size={32} />
            <Composer
              isSignedIn={isSignedIn}
              placeholder="Add a reply..."
              autoFocus
              onCancel={() => setReplying(false)}
              onSubmit={async (text) => {
                const res = await postComment(videoId, text, comment.id);
                if ("error" in res) return false;
                setReplying(false);
                adjustCount(1);
                setRepliesOpen(true);
                const fresh = await loadReplies(comment.id);
                setReplies(fresh);
                setReplyCount(fresh.length);
                return true;
              }}
            />
          </div>
        ) : null}

        {!isReply && replyCount > 0 ? (
          <div className="mt-2">
            {!repliesOpen ? (
              <button
                type="button"
                onClick={showReplies}
                className="text-sm font-medium text-accent hover:underline"
              >
                View {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </button>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                {replies.map((r) => (
                  <CommentItem
                    key={r.id}
                    comment={r}
                    videoId={videoId}
                    isSignedIn={isSignedIn}
                    isCreator={isCreator}
                    myAvatar={myAvatar}
                    isReply
                    adjustCount={adjustCount}
                    onRemoved={(id) => removeReplyLocally(id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** WATCH-8 / SOCIAL-6..12: the full comments section under the watch page. */
export function Comments({
  videoId,
  isSignedIn,
  isCreator,
  myAvatar,
  initial,
}: {
  videoId: string;
  isSignedIn: boolean;
  isCreator: boolean;
  myAvatar: string | null;
  initial: { enabled: boolean; count: number; comments: CommentDTO[] };
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [comments, setComments] = useState(initial.comments);
  const [count, setCount] = useState(initial.count);
  const [sort, setSort] = useState<"top" | "newest">("top");
  const [, startTransition] = useTransition();

  const adjustCount = (d: number) => setCount((c) => Math.max(0, c + d));

  function changeSort(s: "top" | "newest") {
    if (s === sort) return;
    setSort(s);
    startTransition(async () => setComments(await fetchComments(videoId, s)));
  }

  function removeTop(id: string, removedReplies: number) {
    setComments((cs) => cs.filter((c) => c.id !== id));
    adjustCount(-(1 + removedReplies));
  }

  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const res = await toggleComments(videoId, next);
      if ("error" in res) setEnabled(!next);
    });
  }

  if (!enabled) {
    return (
      <div className="mt-6 rounded-xl bg-hover p-4 text-sm text-fg-muted">
        Comments are turned off.{" "}
        {isCreator ? (
          <button
            type="button"
            onClick={toggleEnabled}
            className="font-medium text-accent hover:underline"
          >
            Turn on
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-6">
        <h2 className="text-lg font-bold">
          {formatCompact(count)} {count === 1 ? "Comment" : "Comments"}
        </h2>
        <div className="flex gap-4 text-sm">
          <button
            type="button"
            onClick={() => changeSort("top")}
            className={sort === "top" ? "font-medium text-fg" : "text-fg-muted"}
          >
            Top
          </button>
          <button
            type="button"
            onClick={() => changeSort("newest")}
            className={
              sort === "newest" ? "font-medium text-fg" : "text-fg-muted"
            }
          >
            Newest
          </button>
        </div>
        {isCreator ? (
          <button
            type="button"
            onClick={toggleEnabled}
            className="ml-auto text-sm text-fg-muted hover:text-fg"
          >
            Turn off comments
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex gap-3">
        <Avatar url={myAvatar} size={40} />
        <Composer
          isSignedIn={isSignedIn}
          onSubmit={async (text) => {
            const res = await postComment(videoId, text);
            if ("error" in res) return false;
            setComments((cs) => [res.comment, ...cs]);
            adjustCount(1);
            return true;
          }}
        />
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            videoId={videoId}
            isSignedIn={isSignedIn}
            isCreator={isCreator}
            myAvatar={myAvatar}
            adjustCount={adjustCount}
            onRemoved={removeTop}
          />
        ))}
      </div>
    </div>
  );
}
