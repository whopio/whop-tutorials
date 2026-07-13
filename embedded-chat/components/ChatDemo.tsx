"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge, Separator, Text } from "@whop/react/components";
import { ApiChatPanel } from "@/components/ApiChatPanel";
import { LiveElementSection } from "@/components/LiveElementSection";
import { ChatExplainer } from "@/components/ChatExplainer";
import { StepRail } from "@/components/StepRail";
import { steps } from "@/components/steps";
import { EventsLog, type ActivityEntry } from "@/components/EventsLog";
import { ModerationPanel } from "@/components/ModerationPanel";
import { ThemeControls, accentHex, accentFg, type ThemeState } from "@/components/ThemeControls";
import { DeviceFrame } from "@/components/DeviceFrame";

type DemoUser = { key: string; name: string; userId: string };
type Channel = { id: string; name: string; readOnly: boolean };

type Surface = "general" | "announcements" | "dms" | "support";
type RenderPath = "embed" | "api";

const SURFACES: Array<{ key: Surface; label: string }> = [
  { key: "general", label: "General" },
  { key: "announcements", label: "Announcements" },
  { key: "dms", label: "Direct messages" },
  { key: "support", label: "Support" },
];

export function ChatDemo({
  sandbox,
  prodReady,
  demoUsers,
  channels,
  dms,
  supportByUser,
}: {
  sandbox: boolean;
  prodReady: boolean;
  demoUsers: DemoUser[];
  channels: { general: Channel; announcements: Channel };
  dms: { group: { id: string; name: string }; direct: { id: string; name: string } };
  supportByUser: Record<string, string>;
}) {
  // Default to the polished embed when production is live; otherwise the REST
  // path, which always works (sandbox), so the demo is never blank.
  const [renderPath, setRenderPath] = useState<RenderPath>(prodReady ? "embed" : "api");
  const [meKey, setMeKey] = useState(demoUsers[0].key);
  const [surface, setSurface] = useState<Surface>("general");
  const [dmSel, setDmSel] = useState<"group" | "direct">("group");
  const [theme, setTheme] = useState<ThemeState>({
    appearance: "light",
    preset: "sunset",
    chatStyle: "imessage",
  });
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [generalReadOnly, setGeneralReadOnly] = useState(false);

  const me = demoUsers.find((u) => u.key === meKey) ?? demoUsers[0];
  const userOrder = useMemo(() => demoUsers.map((u) => u.userId), [demoUsers]);
  const canDirect = meKey === "ava" || meKey === "ben";

  const addActivity = useCallback((e: { kind: string; detail: string }) => {
    const at = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setActivity((prev) => [{ ...e, at }, ...prev].slice(0, 40));
  }, []);

  // Walkthrough steps live on specific tabs; switch so the highlighted
  // region is actually on screen ("theme" exists on both, leave it alone).
  const handleStep = useCallback((id: string) => {
    if (id === "embed") setRenderPath("embed");
    else if (["users", "surfaces", "chat", "moderation"].includes(id)) {
      setRenderPath("api");
    }
  }, []);

  // Resolve the active channel + read-only hint for the current surface/user.
  const { channelId, readOnlyHint } = useMemo(() => {
    switch (surface) {
      case "general":
        return { channelId: channels.general.id, readOnlyHint: generalReadOnly };
      case "announcements":
        return { channelId: channels.announcements.id, readOnlyHint: true };
      case "dms":
        return {
          channelId: dmSel === "direct" && canDirect ? dms.direct.id : dms.group.id,
          readOnlyHint: false,
        };
      case "support":
        return { channelId: supportByUser[meKey], readOnlyHint: false };
    }
  }, [surface, dmSel, canDirect, generalReadOnly, channels, dms, supportByUser, meKey]);

  const accent = accentHex(theme.preset);
  const dark = theme.appearance === "dark";

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start">
        {/* Left rail */}
        <aside className="order-2 shrink-0 lg:order-1 lg:sticky lg:top-8 lg:w-[380px]">
          <ChatExplainer sandbox={sandbox} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge color="green" variant="soft">
              Embed: live on production
            </Badge>
            <Badge color="orange" variant="soft">
              Chat API: live on sandbox
            </Badge>
          </div>
          <Separator size="4" className="my-5" />
          <StepRail steps={steps} onStepChange={handleStep} />
        </aside>

        {/* Interactive column */}
        <section className="order-1 min-w-0 flex-1 lg:order-2">
          {/* Render-path toggle */}
          <div data-annotation-id="render-path" className="mb-5">
            <Text size="1" color="gray" as="div" className="mb-1.5">
              How the chat is rendered
            </Text>
            <div className="inline-flex rounded-xl border border-[#E5E4E0] bg-white/70 p-1">
              {(
                [
                  ["embed", "Prebuilt embed"],
                  ["api", "Chat API"],
                ] as Array<[RenderPath, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRenderPath(key)}
                  className={[
                    "rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
                    renderPath === key
                      ? "bg-[#151515] text-white"
                      : "text-[#151515]/70 hover:bg-[#151515]/5",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
            <Text size="1" color="gray" as="p" className="mt-1.5">
              {renderPath === "embed"
                ? "Whop's drop-in element, live on production. The polished path most apps ship."
                : "The same conversations rendered from the REST Chat API on sandbox, with full control over the UI."}
            </Text>
          </div>

          {renderPath === "embed" ? (
            <div data-annotation-id="embed">
              <LiveElementSection
                prodReady={prodReady}
                theme={theme}
                onActivity={addActivity}
              />
            </div>
          ) : (
            <>
              {/* User switcher */}
              <div data-annotation-id="users" className="relative">
                <Text size="1" color="gray" as="div" className="mb-1.5">
                  You are viewing as
                </Text>
                <div className="flex flex-wrap gap-2">
                  {demoUsers.map((u, i) => {
                    const active = u.key === meKey;
                    return (
                      <button
                        key={u.key}
                        type="button"
                        onClick={() => setMeKey(u.key)}
                        className={[
                          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                          active
                            ? "border-[#151515] bg-[#151515] text-white"
                            : "border-[#E5E4E0] bg-white text-[#151515] hover:border-[#151515]/30",
                        ].join(" ")}
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                          style={{ backgroundColor: ["#FA4616", "#2D7FF9", "#12A150", "#8B5CF6"][i % 4] }}
                        >
                          {u.name[0]}
                        </span>
                        {u.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Surface tabs */}
              <div
                data-annotation-id="surfaces"
                className="mt-5 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex flex-wrap gap-1 rounded-xl border border-[#E5E4E0] bg-white/70 p-1">
                  {SURFACES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSurface(s.key)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                        surface === s.key
                          ? "bg-[#151515] text-white"
                          : "text-[#151515]/70 hover:bg-[#151515]/5",
                      ].join(" ")}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* DM sub-tabs */}
              {surface === "dms" ? (
                <div className="mt-3 flex gap-2">
                  {[
                    ["group", dms.group.name] as const,
                    ...(canDirect ? [["direct", dms.direct.name] as const] : []),
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDmSel(key)}
                      className={[
                        "rounded-full border px-3 py-1 text-xs transition",
                        (dmSel === key || (key === "group" && dmSel === "direct" && !canDirect))
                          ? "border-[#151515] bg-[#151515] text-white"
                          : "border-[#E5E4E0] bg-white text-[#151515]/80",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                  {!canDirect ? (
                    <span className="self-center text-[11px] text-[#9A9993]">
                      Cara is not in the 1:1 DM, so she only sees the group.
                    </span>
                  ) : null}
                </div>
              ) : null}

              {/* Chat area, inside the playground's window frame */}
              <div data-annotation-id="chat" className="mt-3">
                <div className="h-[560px]">
                  <DeviceFrame
                    device="desktop"
                    urlLabel={`orbit.demo/${surface}`}
                    dark={dark}
                  >
                    <ApiChatPanel
                      key={`${channelId}-${me.userId}`}
                      channelId={channelId}
                      meUserId={me.userId}
                      meName={me.name}
                      userOrder={userOrder}
                      readOnlyHint={readOnlyHint}
                      accent={accent}
                      accentFg={accentFg(theme.preset)}
                      dark={dark}
                      chatStyle={theme.chatStyle}
                      onActivity={addActivity}
                    />
                  </DeviceFrame>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge color="orange" variant="soft">
                    Rendered from Whop&apos;s Chat API
                  </Badge>
                  {surface === "support" ? (
                    <Text size="1" color="gray" as="p">
                      Each member has their own support chat; staff see all of them
                      in an inbox built from <code>supportChannels.list</code>.
                    </Text>
                  ) : null}
                </div>
              </div>
            </>
          )}

          {/* Controls */}
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <ControlCard title="Theme & layout" annotation="theme">
              <ThemeControls
                theme={theme}
                onChange={(patch) => setTheme((t) => ({ ...t, ...patch }))}
              />
            </ControlCard>

            {renderPath === "api" ? (
              <ControlCard title="Moderate General" annotation="moderation">
                <ModerationPanel
                  onChange={(s) => setGeneralReadOnly(s.who_can_post === "admins")}
                  onActivity={addActivity}
                />
              </ControlCard>
            ) : null}

            <ControlCard title="Activity">
              <EventsLog entries={activity} />
            </ControlCard>
          </div>
        </section>
      </div>
    </main>
  );
}

function ControlCard({
  title,
  annotation,
  children,
}: {
  title: string;
  annotation?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-annotation-id={annotation}
      className="relative rounded-xl border border-[#E5E4E0] bg-white p-4 shadow-sm"
    >
      <Text size="2" weight="bold" as="div" className="mb-3">
        {title}
      </Text>
      {children}
    </div>
  );
}
