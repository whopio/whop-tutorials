"use client";

import type { ReactNode } from "react";

export type DeviceMode = "desktop" | "mobile";

// Tailwind port of the official chat playground's device frame: a Mac-style
// window for desktop and an iPhone bezel with a notch for mobile. Purely
// presentational; the chat surface renders inside unchanged.
function WindowControls({ urlLabel }: { urlLabel: string }) {
  return (
    <div className="flex shrink-0 items-center border-b border-black/10 bg-[#ECECEA] px-3 py-2">
      <div className="flex gap-1.5 py-1">
        <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
        <span className="h-2 w-2 rounded-full bg-[#FFBD2E]" />
        <span className="h-2 w-2 rounded-full bg-[#28C840]" />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center">
        <div className="flex h-5 w-2/5 items-center justify-center rounded bg-black/5">
          <span className="truncate text-[10px] text-[#6B6A66]">{urlLabel}</span>
        </div>
      </div>
    </div>
  );
}

export function DeviceFrame({
  device,
  urlLabel,
  dark,
  children,
}: {
  device: DeviceMode;
  urlLabel: string;
  dark?: boolean;
  children: ReactNode;
}) {
  if (device === "mobile") {
    return (
      <div className="flex justify-center">
        <div className="relative flex h-[680px] w-full max-w-[375px] flex-col overflow-hidden rounded-[40px] border-8 border-black bg-black shadow-sm">
          <div className="absolute left-1/2 top-3 z-10 h-7 w-[120px] -translate-x-1/2 rounded-[14px] bg-black" />
          <div
            className={[
              "flex h-full w-full flex-col overflow-hidden rounded-[32px] pt-12",
              dark ? "bg-[#111111]" : "bg-white",
            ].join(" ")}
          >
            <div className="min-h-0 flex-1">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E5E4E0] bg-[#ECECEA] shadow-sm">
      <WindowControls urlLabel={urlLabel} />
      <div
        className={[
          "min-h-0 flex-1 overflow-hidden",
          dark ? "bg-[#111111]" : "bg-white",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
