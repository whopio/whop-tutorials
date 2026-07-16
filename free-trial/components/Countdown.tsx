"use client";

import { useEffect, useState } from "react";
import { Text } from "@whop/react/components";

function breakdown(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  };
}

// Live countdown to an ISO timestamp (the trial's renewal_period_end). The
// clock only starts after mount so the server and client render the same
// initial markup (no hydration mismatch from Date.now()).
export function Countdown({ target }: { target: string }) {
  const targetMs = new Date(target).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (Number.isNaN(targetMs)) return null;

  if (now === null) {
    return (
      <Text size="7" weight="bold">
        --
      </Text>
    );
  }

  const remaining = targetMs - now;
  if (remaining <= 0) {
    return (
      <Text size="5" weight="bold" color="orange">
        Charging now...
      </Text>
    );
  }

  const { days, hours, mins, secs } = breakdown(remaining);
  const cell = (value: number, unit: string, pad = true) => (
    <span className="flex items-baseline gap-0.5">
      <span className="text-3xl font-bold tabular-nums text-[#151515]">
        {pad ? String(value).padStart(2, "0") : value}
      </span>
      <span className="text-sm font-medium text-[#151515]/50">{unit}</span>
    </span>
  );

  return (
    <div className="flex items-baseline gap-3">
      {cell(days, "d", false)}
      {cell(hours, "h")}
      {cell(mins, "m")}
      {cell(secs, "s")}
    </div>
  );
}
