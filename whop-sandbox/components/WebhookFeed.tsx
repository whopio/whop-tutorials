"use client";

import { useEffect, useState } from "react";
import { Badge, Code, Text } from "@whop/react/components";

interface FeedEvent {
  id: string;
  type: string;
  receivedAt: string;
  summary: string;
}

const TYPE_COLOR: Record<string, "green" | "red" | "amber" | "gray"> = {
  "payment.succeeded": "green",
  "payment.failed": "red",
  "payment.pending": "amber",
  "refund.created": "amber",
  "refund.updated": "amber",
  "membership.activated": "green",
  "membership.deactivated": "gray",
};

function relative(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// Step 6: the sandbox company's webhook deliveries, polled every 2 seconds.
// Shared across visitors by design; your step-3 payment should appear here
// within seconds of paying.
export function WebhookFeed({ enabled }: { enabled: boolean }) {
  const [events, setEvents] = useState<FeedEvent[] | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    async function poll() {
      try {
        const res = await fetch("/api/events");
        if (res.ok && !stop) {
          const data = (await res.json()) as { events: FeedEvent[] };
          setEvents(data.events);
        }
      } catch {
        // Transient polling errors just wait for the next tick.
      }
    }
    void poll();
    const timer = setInterval(poll, 2000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [enabled]);

  if (!enabled) {
    return (
      <Text size="1" color="gray" as="p">
        The live feed is off because DATABASE_URL isn&apos;t set. The events
        still fire, they just aren&apos;t shown here.
      </Text>
    );
  }

  if (events === null) {
    return (
      <Text size="1" color="gray" as="p">
        Connecting to the feed...
      </Text>
    );
  }

  if (events.length === 0) {
    return (
      <Text size="1" color="gray" as="p">
        Nothing yet. Buy or refund the demo product above and it shows up here
        within seconds.
      </Text>
    );
  }

  return (
    <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
      {events.map((e) => (
        <div key={e.id} className="flex flex-wrap items-center gap-2">
          <Badge color={TYPE_COLOR[e.type] ?? "gray"} variant="soft" size="1">
            {e.type}
          </Badge>
          {e.summary && (
            <Code size="1" variant="ghost" className="truncate">
              {e.summary}
            </Code>
          )}
          <span className="ml-auto shrink-0 text-[10px] text-[#9A9993]">
            {relative(e.receivedAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
