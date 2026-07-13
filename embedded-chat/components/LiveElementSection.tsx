"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Text } from "@whop/react/components";
import type {
  Appearance,
  ChatElementEvent,
} from "@whop/embedded-components-vanilla-js/types";
import { LiveElement } from "@/components/LiveElement";
import { DeviceFrame } from "@/components/DeviceFrame";
import { getPreset, type ThemeState } from "@/components/ThemeControls";
import { demoUsers, channel } from "@/constants/whop-ids.prod";

const AVATAR_COLORS = ["#FA4616", "#2D7FF9", "#12A150", "#8B5CF6"];

// The "Prebuilt embed" tab: the genuine <ChatElement>, live on the production
// company, with playground-style profile switching. The demo's theme controls
// drive its appearance. Switching profiles remounts the element (keyed on the
// user id) so it re-authenticates as the selected demo user.
export function LiveElementSection({
  prodReady,
  theme,
  onActivity,
}: {
  prodReady: boolean;
  theme: ThemeState;
  onActivity?: (e: { kind: string; detail: string }) => void;
}) {
  const [meUserId, setMeUserId] = useState(demoUsers[0]?.userId ?? "");

  // Lazy reset: ping the reset endpoint on load. It only wipes + reseeds when
  // the channel is stale, so it is safe to call on every mount.
  useEffect(() => {
    if (!prodReady) return;
    fetch("/api/prod-reset", { method: "POST" }).catch(() => {});
  }, [prodReady]);

  const appearance = useMemo(
    () =>
      ({
        theme: {
          appearance: theme.appearance,
          accentColor: getPreset(theme.preset).accent,
        },
      }) as Appearance,
    [theme.appearance, theme.preset],
  );

  if (!prodReady) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-xl border border-dashed border-[#D8D7D2] bg-white/60 px-6 text-center">
        <Text size="2" color="gray" as="p">
          The live <code>&lt;ChatElement&gt;</code> renders here once production
          credentials are added.
        </Text>
      </div>
    );
  }

  const dark = theme.appearance === "dark";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Text size="1" color="gray" as="span" className="mr-1">
          Posting as
        </Text>
        {demoUsers.map((u, i) => {
          const active = u.userId === meUserId;
          return (
            <button
              key={u.userId}
              type="button"
              onClick={() => setMeUserId(u.userId)}
              className={[
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                active
                  ? "border-[#151515] bg-[#151515] text-white"
                  : "border-[#E5E4E0] bg-white text-[#151515] hover:border-[#151515]/30",
              ].join(" ")}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {u.name[0]}
              </span>
              {u.name}
            </button>
          );
        })}
      </div>

      <div className="h-[520px]">
        <DeviceFrame device="desktop" urlLabel="orbit.community/general" dark={dark}>
          <LiveElement
            key={meUserId}
            userId={meUserId}
            channelId={channel.id}
            chatStyle={theme.chatStyle}
            appearance={appearance}
            onEvent={(event: ChatElementEvent) =>
              onActivity?.({ kind: event.type, detail: `element: ${event.type}` })
            }
          />
        </DeviceFrame>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge color="green" variant="soft">
          Live on production
        </Badge>
        <Text size="1" color="gray" as="p">
          The real Whop <code>&lt;ChatElement&gt;</code>, moderated and reset periodically.
        </Text>
      </div>
    </div>
  );
}
