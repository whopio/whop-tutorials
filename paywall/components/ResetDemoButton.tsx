"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Popover, Text } from "@whop/react/components";

export function ResetDemoButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button type="button" size="1" variant="soft" color="gray">
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
          This clears the demo&apos;s session cookie and relocks the posts.
        </Text>
        <div className="mt-1">
          <Text size="1" color="gray" as="div">
            Whop still remembers the purchase: sign in with Whop to restore
            it, or replay checkout with a new email.
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
              setOpen(false);
              setBusy(false);
              router.refresh();
            }}
          >
            {busy ? "Resetting..." : "Reset"}
          </Button>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
