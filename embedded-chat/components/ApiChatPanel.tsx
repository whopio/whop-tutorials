"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChatMessage } from "@/lib/chat";

// A replica of Whop's chat element rendered from the REST Chat API. Colors,
// radii and the hover toolbar were sampled from the live element on
// docs.whop.com's playground so the demo looks like the real thing while
// staying sandbox-friendly. Everything a visitor does (send, react, reply,
// delete) is local and optimistic: it never writes to the shared demo
// channels and clears on refresh.

const USER_COLORS = ["#FA4616", "#2D7FF9", "#12A150", "#8B5CF6", "#E5484D"];
const PICKER = ["❤️", "🔥", "👍", "😂", "🎉", "👀", "🙏", "💯"];

// The API returns seeded reactions as :shortcodes:; render them as real emoji.
const EMOJI: Record<string, string> = {
  fire: "🔥",
  heart: "❤️",
  "+1": "👍",
  thumbsup: "👍",
  "-1": "👎",
  thumbsdown: "👎",
  joy: "😂",
  smile: "😄",
  tada: "🎉",
  clap: "👏",
  eyes: "👀",
  rocket: "🚀",
  "100": "💯",
  pray: "🙏",
  wave: "👋",
  thinking: "🤔",
  sob: "😭",
  skull: "💀",
};

function emojiFor(raw: string | null): string {
  if (!raw) return "";
  const m = raw.match(/^:([a-z0-9_+-]+):$/i);
  if (!m) return raw;
  return EMOJI[m[1].toLowerCase()] ?? m[1];
}

function colorFor(userId: string, order: string[]): string {
  const i = order.indexOf(userId);
  return USER_COLORS[(i < 0 ? 0 : i) % USER_COLORS.length];
}
function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
function fullTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${date} ${clock(iso)}`;
}
function dayLabel(iso: string, withAt: boolean): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  const t = clock(iso);
  if (diffDays === 0) return withAt ? `Today at ${t}` : t;
  if (diffDays === 1) return `Yesterday at ${t}`;
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  if (diffDays < 7) return `${weekday} ${t}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${t}`;
}

// iMessage corner tightening: the avatar-side corners collapse to 8px
// between messages of the same group (sampled from the real element).
function corners(mine: boolean, first: boolean, last: boolean): string {
  if (mine) return `18px ${first ? 18 : 8}px ${last ? 18 : 8}px 18px`;
  return `${first ? 18 : 8}px 18px 18px ${last ? 18 : 8}px`;
}

export type ChatActivity = (entry: { kind: string; detail: string }) => void;

interface Group {
  key: string;
  userId: string;
  userName: string;
  first: ChatMessage;
  items: ChatMessage[];
  divider: string | null;
}

type MenuState =
  | { kind: "kebab" | "picker"; id: string; top: number; left?: number; right?: number }
  | null;

export function ApiChatPanel({
  channelId,
  meUserId,
  meName,
  userOrder,
  readOnlyHint,
  accent = "#FA4616",
  accentFg = "#FFFFFF",
  dark = false,
  chatStyle = "imessage",
  onActivity,
}: {
  channelId: string;
  meUserId: string;
  meName: string;
  userOrder: string[];
  readOnlyHint?: boolean;
  accent?: string;
  accentFg?: string;
  dark?: boolean;
  chatStyle?: "imessage" | "discord";
  onActivity?: ChatActivity;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "no_access">("loading");
  const [input, setInput] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [reactDelta, setReactDelta] = useState<Record<string, Record<string, number>>>({});
  const [myReacts, setMyReacts] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const atBottomRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/chat/messages?channelId=${encodeURIComponent(channelId)}&userId=${meUserId}`,
      );
      if (res.status === 403) {
        setStatus("no_access");
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setStatus("ok");
      setMessages(data.messages ?? []);
    } catch {
      // Transient network failure: keep the current view; the next poll retries.
    }
  }, [channelId, meUserId]);

  useEffect(() => {
    setStatus("loading");
    load();
    const id = setInterval(load, 2500);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, localMessages]);

  // Close any open menu when the list scrolls (its fixed position would drift).
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setMenu(null);
  };

  // Simulated send: renders instantly for this visitor only and is never
  // posted to Whop, so the shared demo channels stay clean.
  const send = useCallback(() => {
    const content = input.trim();
    if (!content) return;
    setLocalMessages((prev) => [
      ...prev,
      {
        id: `local_${Date.now()}_${prev.length}`,
        content,
        created_at: new Date().toISOString(),
        message_type: "regular",
        is_pinned: false,
        replying_to_message_id: replyTo?.id ?? null,
        user: { id: meUserId, username: meName, name: meName },
        reaction_counts: [],
        poll: null,
        poll_votes: [],
      },
    ]);
    setInput("");
    setReplyTo(null);
    atBottomRef.current = true;
    onActivity?.({ kind: "messageSent", detail: `${meName}: ${content} (simulated)` });
  }, [input, replyTo, meUserId, meName, onActivity]);

  const startReply = useCallback((m: ChatMessage) => {
    setReplyTo(m);
    setMenu(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const deleteMsg = useCallback(
    (m: ChatMessage) => {
      setMenu(null);
      if (m.id.startsWith("local_")) {
        setLocalMessages((prev) => prev.filter((x) => x.id !== m.id));
        onActivity?.({ kind: "messageDeleted", detail: "simulated message removed" });
      } else {
        // Hide locally only; never delete a shared demo message. It comes
        // back on refresh.
        setHidden((prev) => new Set(prev).add(m.id));
        onActivity?.({ kind: "messageDeleted", detail: "message hidden (local only)" });
      }
    },
    [onActivity],
  );

  const copyText = useCallback(
    (m: ChatMessage) => {
      setMenu(null);
      void navigator.clipboard?.writeText(m.content ?? "");
      onActivity?.({ kind: "copyText", detail: "copied message text" });
    },
    [onActivity],
  );

  // Reactions are local + optimistic: a delta on top of the seeded counts,
  // so visitors can try reacting without writing to the shared channel.
  const toggleReact = useCallback(
    (id: string, em: string) => {
      setMenu(null);
      const key = `${id}|${em}`;
      const has = myReacts.has(key);
      setMyReacts((prev) => {
        const n = new Set(prev);
        if (has) n.delete(key);
        else n.add(key);
        return n;
      });
      setReactDelta((prev) => {
        const msg = { ...(prev[id] ?? {}) };
        msg[em] = (msg[em] ?? 0) + (has ? -1 : 1);
        if (msg[em] === 0) delete msg[em];
        return { ...prev, [id]: msg };
      });
      onActivity?.({ kind: "reaction", detail: `${meName} ${has ? "removed" : "reacted"} ${em}` });
    },
    [myReacts, meName, onActivity],
  );

  const openKebab = useCallback(
    (e: React.MouseEvent, id: string) => {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setMenu({ kind: "kebab", id, top: r.bottom + 4, right: window.innerWidth - r.right });
    },
    [],
  );
  const openPicker = useCallback((e: React.MouseEvent, id: string) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ kind: "picker", id, top: r.top - 44, left: r.left - 8 });
  }, []);

  const all = useMemo(
    () =>
      [...messages, ...localMessages].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      ),
    [messages, localMessages],
  );
  const byId = useMemo(() => new Map(all.map((m) => [m.id, m])), [all]);

  const reactionsFor = useCallback(
    (m: ChatMessage): Array<{ em: string; count: number; self: boolean }> => {
      const merged = new Map<string, number>();
      for (const r of m.reaction_counts) {
        const em = emojiFor(r.emoji);
        if (em) merged.set(em, (merged.get(em) ?? 0) + r.count);
      }
      for (const [em, delta] of Object.entries(reactDelta[m.id] ?? {})) {
        merged.set(em, (merged.get(em) ?? 0) + delta);
      }
      return [...merged.entries()]
        .filter(([, c]) => c > 0)
        .map(([em, count]) => ({ em, count, self: myReacts.has(`${m.id}|${em}`) }));
    },
    [reactDelta, myReacts],
  );

  const groups = useMemo(() => {
    const out: Group[] = [];
    const regular = all.filter((m) => m.message_type === "regular" && !hidden.has(m.id));
    for (const m of regular) {
      const prev = out[out.length - 1];
      const prevLast = prev?.items[prev.items.length - 1];
      const gap = prevLast
        ? new Date(m.created_at).getTime() - new Date(prevLast.created_at).getTime()
        : Infinity;
      const newDay =
        prevLast &&
        new Date(m.created_at).toDateString() !== new Date(prevLast.created_at).toDateString();
      const needsDivider = !prevLast || newDay || gap > 3_600_000;
      if (
        prev &&
        !needsDivider &&
        prev.userId === m.user.id &&
        gap < 300_000 &&
        !m.replying_to_message_id
      ) {
        prev.items.push(m);
      } else {
        out.push({
          key: m.id,
          userId: m.user.id,
          userName: m.user.name ?? m.user.username,
          first: m,
          items: [m],
          divider: needsDivider ? dayLabel(m.created_at, true) : null,
        });
      }
    }
    return out;
  }, [all, hidden]);

  // ── palette (sampled from the real element) ──────────────────────────
  const c = {
    otherBubbleBg: dark ? "#222222" : "#F0F0F0",
    otherBubbleFg: dark ? "#EEEEEE" : "#202020",
    name: dark ? "#7B7B7B" : "#838383",
    divider: dark ? "rgba(255,255,255,0.447)" : "rgba(0,0,0,0.486)",
    pillBg: dark ? "rgba(255,255,255,0.106)" : "rgba(0,0,0,0.09)",
    pillFg: dark ? "rgba(255,255,255,0.686)" : "rgba(0,0,0,0.608)",
    ghost: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    ghostHover: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.09)",
    icon: dark ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.608)",
    border: dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)",
    text: dark ? "#EEEEEE" : "#202020",
    card: dark ? "#1C1C1E" : "#FFFFFF",
    danger: dark ? "#FF6B6B" : "#E5484D",
  };

  function IconButton({
    onClick,
    title,
    children,
  }: {
    onClick: (e: React.MouseEvent) => void;
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        title={title}
        onClick={onClick}
        className="flex h-7 w-7 items-center justify-center rounded-md transition"
        style={{ color: c.icon }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = c.ghostHover)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        {children}
      </button>
    );
  }

  const toolbar = (m: ChatMessage) => (
    <div
      className="flex h-8 items-center gap-0.5 self-center rounded-lg px-0.5"
      style={{ backgroundColor: c.card, boxShadow: `0 1px 6px rgba(0,0,0,0.14), 0 0 0 1px ${c.border}` }}
    >
      <IconButton onClick={() => toggleReact(m.id, "❤️")} title="Like">
        <Heart filled={myReacts.has(`${m.id}|❤️`)} />
      </IconButton>
      <IconButton onClick={(e) => openPicker(e, m.id)} title="Add reaction">
        <SmileyPlus color={c.icon} />
      </IconButton>
      <IconButton onClick={() => startReply(m)} title="Reply">
        <ReplyIcon />
      </IconButton>
      <IconButton onClick={(e) => openKebab(e, m.id)} title="More">
        <Kebab />
      </IconButton>
    </div>
  );

  const reactionsRow = (m: ChatMessage, mine: boolean) => {
    const list = reactionsFor(m);
    if (!list.length) return null;
    return (
      <div
        className={[
          "mt-0.5 flex items-center gap-[2px]",
          mine && chatStyle === "imessage" ? "justify-end" : "",
        ].join(" ")}
      >
        {list.map((r) => (
          <button
            key={r.em}
            type="button"
            onClick={() => toggleReact(m.id, r.em)}
            className="flex h-[26px] items-center gap-1 rounded-full pl-2 pr-2.5 text-[13px] leading-none transition"
            style={
              r.self
                ? { backgroundColor: `${accent}1F`, boxShadow: `inset 0 0 0 1px ${accent}`, color: accent }
                : { backgroundColor: c.pillBg, color: c.pillFg }
            }
          >
            <span className="text-[13px]">{r.em}</span>
            <span className="text-[12px] font-medium">{r.count}</span>
          </button>
        ))}
      </div>
    );
  };

  const replyPreview = (m: ChatMessage) => {
    if (!m.replying_to_message_id) return null;
    const target = byId.get(m.replying_to_message_id);
    if (!target) return null;
    return (
      <div className="mb-0.5 flex items-center gap-1.5 pl-1 text-[12px]" style={{ color: c.name }}>
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="shrink-0">
          <path d="M1 10 V5 Q1 1 5 1 H15" stroke={c.name} strokeWidth="1.4" fill="none" />
        </svg>
        <span className="font-medium">{target.user.name ?? target.user.username}</span>
        <span className="max-w-[180px] truncate opacity-80">{target.content}</span>
      </div>
    );
  };

  const body = useMemo(() => {
    const stateText = { color: dark ? "rgba(255,255,255,0.5)" : "#6B6A66" };
    if (status === "loading") {
      return (
        <div className="flex h-full items-center justify-center text-sm" style={stateText}>
          Loading messages...
        </div>
      );
    }
    if (status === "no_access") {
      return (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm" style={stateText}>
          This user does not have access to this conversation. Whop enforces
          access per user; switch to a participant to view it.
        </div>
      );
    }
    if (!groups.length) {
      return (
        <div className="flex h-full items-center justify-center text-sm" style={stateText}>
          No messages yet. Say hello below.
        </div>
      );
    }

    return groups.map((g) => {
      const mine = g.userId === meUserId;
      const av = colorFor(g.userId, userOrder);
      const divider = g.divider ? (
        <div
          key={`${g.key}-div`}
          className="my-3 text-center text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: c.divider }}
        >
          {g.divider}
        </div>
      ) : null;

      if (chatStyle === "discord") {
        return (
          <div key={g.key}>
            {divider}
            <div className="relative py-0.5 pl-[52px] pr-2">
              <div
                className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                style={{ backgroundColor: av }}
                title={g.userName}
              >
                {initials(g.userName)}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-medium" style={{ color: c.text }}>
                  {g.userName}
                </span>
                <span className="text-[12px]" style={{ color: c.name }}>
                  {dayLabel(g.first.created_at, false)}
                </span>
              </div>
              {g.items.map((m) => (
                <div
                  key={m.id}
                  className="relative -mx-1 rounded px-1"
                  onMouseEnter={() => setHoverId(m.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  {replyPreview(m)}
                  <p className="text-[15px] leading-[1.5]" style={{ color: c.text }}>
                    {m.content}
                  </p>
                  <PollBlock m={m} mine={false} dark={dark} accent={accent} />
                  {reactionsRow(m, false)}
                  {m.id.startsWith("local_") ? (
                    <div className="text-[10px] italic" style={{ color: c.name }}>
                      Only visible to you
                    </div>
                  ) : null}
                  {hoverId === m.id || menu?.id === m.id ? (
                    <div className="absolute -top-4 right-1">{toolbar(m)}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      }

      // iMessage layout
      return (
        <div key={g.key}>
          {divider}
          <div className={["flex gap-2", mine ? "flex-row-reverse" : ""].join(" ")}>
            {!mine ? (
              <div className="flex w-10 shrink-0 flex-col justify-end">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                  style={{ backgroundColor: av }}
                  title={g.userName}
                >
                  {initials(g.userName)}
                </div>
              </div>
            ) : null}
            <div className={["flex min-w-0 max-w-[78%] flex-col gap-[3px]", mine ? "items-end" : "items-start"].join(" ")}>
              {!mine ? (
                <div className="flex items-center gap-1 pl-2 text-[12px]" style={{ color: c.name }}>
                  <span>{g.userName}</span>
                  <span>&#8226;</span>
                  <span>{dayLabel(g.first.created_at, false)}</span>
                </div>
              ) : null}
              {g.items.map((m, i) => {
                const first = i === 0;
                const last = i === g.items.length - 1;
                const active = hoverId === m.id || menu?.id === m.id;
                return (
                  <div key={m.id} className="w-full">
                    <div
                      className={["flex items-center gap-1.5", mine ? "flex-row-reverse" : ""].join(" ")}
                      onMouseEnter={() => setHoverId(m.id)}
                      onMouseLeave={() => setHoverId(null)}
                    >
                      <div className={mine ? "flex min-w-0 flex-col items-end" : "flex min-w-0 flex-col items-start"}>
                        {replyPreview(m)}
                        <div
                          className="px-3 py-1.5 text-[15px] leading-[1.5]"
                          style={{
                            backgroundColor: mine ? accent : c.otherBubbleBg,
                            color: mine ? accentFg : c.otherBubbleFg,
                            borderRadius: corners(mine, first, last),
                          }}
                        >
                          {m.content}
                          <PollBlock m={m} mine={mine} dark={dark} accent={accent} />
                        </div>
                      </div>
                      {active ? toolbar(m) : null}
                    </div>
                    {reactionsRow(m, mine)}
                    {m.id.startsWith("local_") ? (
                      <div className="mt-0.5 text-right text-[10px] italic" style={{ color: c.name }}>
                        Only visible to you
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, groups, meUserId, userOrder, accent, accentFg, dark, chatStyle, hoverId, menu, reactDelta, myReacts]);

  const composerDisabled = readOnlyHint === true;
  const menuMsg = menu ? byId.get(menu.id) : null;

  return (
    <div className="relative flex h-full flex-col" style={{ backgroundColor: dark ? "#111111" : "#FFFFFF" }}>
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {body}
      </div>

      {/* Composer */}
      <div className="p-2" style={{ borderTop: `1px solid ${c.border}` }}>
        {composerDisabled ? (
          <div
            className="rounded-lg px-3 py-2.5 text-center text-xs"
            style={{ backgroundColor: c.ghost, color: c.pillFg }}
          >
            Read-only channel: only admins can post here. Everyone can still
            read every message.
          </div>
        ) : (
          <>
            {replyTo ? (
              <div
                className="mb-1.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px]"
                style={{ backgroundColor: c.ghost, color: c.text }}
              >
                <ReplyIcon />
                <span className="min-w-0 flex-1 truncate">
                  Replying to{" "}
                  <span className="font-medium">
                    {replyTo.user.name ?? replyTo.user.username}
                  </span>
                  : {replyTo.content}
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="shrink-0 rounded p-0.5"
                  style={{ color: c.name }}
                  title="Cancel reply"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ) : null}
            <div className="flex items-end gap-1.5">
              <button
                type="button"
                title="Attachments are available in the drop-in element"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: c.ghost, color: c.icon }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3.5v11M3.5 9h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Write a message..."
                className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none"
                style={{ color: c.text }}
              />
              {input.trim() ? (
                <button
                  type="button"
                  onClick={send}
                  title="Send"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition"
                  style={{ backgroundColor: accent, color: accentFg }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : (
                <div className="flex shrink-0 items-center gap-1.5 pb-1.5 pr-1" style={{ color: c.icon }}>
                  <SmileyPlus color={c.icon} size={20} />
                  <span
                    className="rounded-[5px] px-1 text-[9px] font-bold leading-[16px]"
                    style={{ backgroundColor: dark ? "#EEEEEE" : "#202020", color: dark ? "#111111" : "#FFFFFF" }}
                  >
                    GIF
                  </span>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2.5a2.5 2.5 0 0 1 2.5 2.5v3.2M6.5 5A2.5 2.5 0 0 1 9 2.5M6.5 5v3.5A2.5 2.5 0 0 0 9 11m4-3v.5A4 4 0 0 1 5 8.5V8m4 5.5V16m0 0h2.5M9 16H6.5M2.5 2.5l13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>
            <div className="mt-1 text-center text-[10px]" style={{ color: c.name }}>
              Sends here are simulated: only you see them, and a refresh clears
              them.
            </div>
          </>
        )}
      </div>

      {/* Floating menus (fixed, so the scroll container never clips them) */}
      {menu ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          {menu.kind === "picker" ? (
            <div
              className="fixed z-50 flex items-center gap-0.5 rounded-full px-2 py-1"
              style={{
                top: menu.top,
                left: menu.left,
                backgroundColor: c.card,
                boxShadow: `0 6px 20px rgba(0,0,0,0.22), 0 0 0 1px ${c.border}`,
              }}
            >
              {PICKER.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleReact(menu.id, e)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[18px] transition hover:scale-125"
                >
                  {e}
                </button>
              ))}
            </div>
          ) : menuMsg ? (
            <div
              className="fixed z-50 min-w-[190px] rounded-xl p-1"
              style={{
                top: menu.top,
                right: menu.right,
                backgroundColor: c.card,
                boxShadow: `0 10px 30px rgba(0,0,0,0.28), 0 0 0 1px ${c.border}`,
              }}
            >
              <MenuItem onClick={() => startReply(menuMsg)} color={c.text} hover={c.ghost} icon={<ReplyIcon />} label="Reply" />
              <MenuItem onClick={() => copyText(menuMsg)} color={c.text} hover={c.ghost} icon={<CopyIcon />} label="Copy text" />
              <MenuItem onClick={() => deleteMsg(menuMsg)} color={c.danger} hover={c.ghost} icon={<TrashIcon />} label="Delete" />
              <div className="my-1 h-px" style={{ backgroundColor: c.border }} />
              <MenuItem color={c.name} hover="transparent" icon={<ClockIcon />} label={fullTime(menuMsg.created_at)} muted />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  color,
  hover,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  color: string;
  hover: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={muted}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[14px] transition"
      style={{ color }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = muted ? "transparent" : hover)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <span className="shrink-0 opacity-90">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function Heart({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? "#F5194A" : "none"}>
      <path
        d="M8 13.5S2 9.8 2 5.9A3.4 3.4 0 0 1 8 3.6a3.4 3.4 0 0 1 6 2.3C14 9.8 8 13.5 8 13.5Z"
        stroke={filled ? "#F5194A" : "currentColor"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ReplyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M7 3.5 3 7l4 3.5M3.5 7H10a3 3 0 0 1 3 3v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Kebab() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="3.5" r="1.3" />
      <circle cx="8" cy="8" r="1.3" />
      <circle cx="8" cy="12.5" r="1.3" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 4.5h10M6.5 4.5V3.2A1 1 0 0 1 7.5 2.2h1a1 1 0 0 1 1 1v1.3M4.2 4.5l.5 8a1.3 1.3 0 0 0 1.3 1.2h4a1.3 1.3 0 0 0 1.3-1.2l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 5v3.2l2 1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SmileyPlus({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="8" r="5.4" stroke={color} strokeWidth="1.3" />
      <circle cx="5.2" cy="7" r="0.8" fill={color} />
      <circle cx="8.8" cy="7" r="0.8" fill={color} />
      <path d="M4.8 9.6a3 3 0 0 0 4.4 0" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M13 2v4M11 4h4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PollBlock({
  m,
  mine,
  dark,
  accent,
}: {
  m: ChatMessage;
  mine: boolean;
  dark: boolean;
  accent: string;
}) {
  if (!m.poll) return null;
  return (
    <div className="mt-2 flex flex-col gap-1">
      {m.poll.options.map((opt) => {
        const votes = m.poll_votes.find((v) => v.option_id === opt.id)?.count ?? 0;
        return (
          <div
            key={opt.id}
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-[13px]"
            style={{
              backgroundColor: mine
                ? "rgba(255,255,255,0.2)"
                : dark
                  ? "rgba(255,255,255,0.1)"
                  : "#FFFFFF",
              color: mine ? undefined : dark ? "#EEEEEE" : "#202020",
            }}
          >
            <span className="min-w-0">{opt.text}</span>
            <span className="shrink-0 tabular-nums" style={{ color: mine ? undefined : accent }}>
              {votes}
            </span>
          </div>
        );
      })}
    </div>
  );
}
