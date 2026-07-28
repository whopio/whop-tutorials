"use client";

import { useState } from "react";
import { Button, Popover, Text } from "@whop/react/components";

export function ResetDemoButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button
          type="button"
          size="2"
          variant="soft"
          color="gray"
          className="w-full"
        >
          Reset demo
        </Button>
      </Popover.Trigger>
      <Popover.Content
        side="bottom"
        align="end"
        size="1"
        className="!max-w-[min(18rem,calc(100vw-2rem))]"
      >
        <Text size="2" as="div">
          This clears your saved progress and receipts.
        </Text>
        <div className="mt-1">
          <Text size="1" color="gray" as="div">
            Your test payments stay on the sandbox dashboard.
          </Text>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button
            type="button"
            size="1"
            variant="ghost"
            color="gray"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="1"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await fetch("/api/reset", { method: "POST" });
              // Hard navigation also clears any return-url query params
              // left over from the redirect walkthrough.
              window.location.assign("/");
            }}
          >
            {busy ? "Resetting..." : "Reset"}
          </Button>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
