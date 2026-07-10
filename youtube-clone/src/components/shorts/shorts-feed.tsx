"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  User,
} from "lucide-react";
import { toggleReaction, toggleSubscribe } from "@/lib/social-actions";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShortItem } from "@/lib/shorts";

function goSignIn() {
  window.location.href = `/sign-in?next=${encodeURIComponent(
    window.location.pathname + window.location.search,
  )}`;
}

/** DESIGN-13: the full vertical Waves player — snap-scrolling one clip per
 * viewport, autoplaying whichever is in view. Full-bleed on mobile; a centered
 * 9:16 stage on desktop. The action rail overlays the video on both. */
export function ShortsFeed({
  shorts,
  isSignedIn,
}: {
  shorts: ShortItem[];
  isSignedIn: boolean;
}) {
  const [muted, setMuted] = useState(true);

  if (shorts.length === 0) {
    return (
      <p className="py-24 text-center text-sm text-fg-muted">
        No Waves yet. Upload a vertical video to get started.
      </p>
    );
  }

  return (
    <div className="-mx-4 -my-4 h-[calc(100dvh-7.5rem)] snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] sm:-mx-6 lg:mx-0 lg:h-[calc(100dvh-3.5rem)]">
      {shorts.map((s) => (
        <ShortSlide
          key={s.id}
          short={s}
          isSignedIn={isSignedIn}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
        />
      ))}
    </div>
  );
}

function RailButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof ThumbsUp;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1"
    >
      <span
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60",
          active && "bg-accent text-accent-fg hover:bg-accent",
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <span className="text-xs font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
        {label}
      </span>
    </button>
  );
}

function ShortSlide({
  short,
  isSignedIn,
  muted,
  onToggleMute,
}: {
  short: ShortItem;
  isSignedIn: boolean;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [reaction, setReaction] = useState(short.myReaction);
  const [likeCount, setLikeCount] = useState(short.likeCount);
  const [subscribed, setSubscribed] = useState(short.isSubscribed);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  // Autoplay whichever clip is in view; pause + rewind the rest.
  useEffect(() => {
    const el = videoRef.current;
    const slide = slideRef.current;
    if (!el || !slide) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) {
          el.play()
            .then(() => setPlaying(true))
            .catch(() => {});
        } else {
          el.pause();
          el.currentTime = 0;
          setPlaying(false);
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    obs.observe(slide);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  function react(type: "LIKE" | "DISLIKE") {
    if (!isSignedIn) return goSignIn();
    const prev = reaction;
    const next = prev === type ? null : type;
    setReaction(next);
    setLikeCount(
      (c) => c + (next === "LIKE" ? 1 : 0) - (prev === "LIKE" ? 1 : 0),
    );
    startTransition(async () => {
      const res = await toggleReaction(short.id, type);
      if ("error" in res) {
        setReaction(prev);
        setLikeCount(short.likeCount);
      } else {
        setReaction(res.reaction);
        setLikeCount(res.likeCount);
      }
    });
  }

  function subscribe() {
    if (!isSignedIn) return goSignIn();
    const next = !subscribed;
    setSubscribed(next);
    startTransition(async () => {
      const res = await toggleSubscribe(short.channel.id);
      if ("error" in res) setSubscribed(!next);
      else setSubscribed(res.subscribed);
    });
  }

  function share() {
    const url = `${window.location.origin}/watch?v=${short.id}`;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }

  return (
    <div
      ref={slideRef}
      className="flex h-full snap-start items-center justify-center"
    >
      {/* Video stage: fills height, never wider than the viewport, centered. */}
      <div className="relative aspect-[9/16] h-full max-w-full overflow-hidden bg-black lg:rounded-2xl">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src={short.videoUrl ?? undefined}
          poster={short.thumbnailUrl ?? undefined}
          loop
          muted
          playsInline
          onClick={togglePlay}
          className="h-full w-full cursor-pointer object-contain"
        />

        {!playing ? (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Play"
            className="absolute inset-0 grid place-items-center"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-black/50 text-white">
              <Play className="h-8 w-8" />
            </span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          {muted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>

        {/* Right action rail — overlays the video, bottom-right. */}
        <div className="absolute bottom-4 right-2 flex flex-col items-center gap-4">
          <RailButton
            icon={ThumbsUp}
            label={formatCompact(likeCount)}
            active={reaction === "LIKE"}
            onClick={() => react("LIKE")}
          />
          <RailButton
            icon={ThumbsDown}
            label="Dislike"
            active={reaction === "DISLIKE"}
            onClick={() => react("DISLIKE")}
          />
          <Link
            href={`/watch?v=${short.id}`}
            className="flex flex-col items-center gap-1"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60">
              <MessageCircle className="h-6 w-6" />
            </span>
            <span className="text-xs font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
              {formatCompact(short.commentCount)}
            </span>
          </Link>
          <RailButton
            icon={Share2}
            label={copied ? "Copied" : "Share"}
            onClick={share}
          />
        </div>

        {/* Channel + title overlay — padded on the right so it clears the rail. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pr-20 text-white">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <Link
              href={`/@${short.channel.handle}`}
              className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white/20"
            >
              {short.channel.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={short.channel.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </Link>
            <Link
              href={`/@${short.channel.handle}`}
              className="text-sm font-medium hover:underline"
            >
              {short.channel.name}
            </Link>
            <button
              type="button"
              onClick={subscribe}
              className={cn(
                "ml-1 rounded-full px-3 py-1 text-xs font-semibold",
                subscribed
                  ? "bg-white/20 text-white"
                  : "bg-white text-black hover:bg-white/90",
              )}
            >
              {subscribed ? "Subscribed" : "Subscribe"}
            </button>
          </div>
          <p className="mt-2 line-clamp-2 text-sm">{short.title}</p>
        </div>
      </div>
    </div>
  );
}
