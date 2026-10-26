"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@whop/react/components";

const INTERVAL_MS = 2000;
const MAX_TRIES = 10;

// Right after checkout the payment can take a moment before Whop lists the
// new membership. Re-read the page a few times instead of showing "locked".
export function ActivationPoller() {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= MAX_TRIES) return;
    const timer = setTimeout(() => {
      router.refresh();
      setTries((count) => count + 1);
    }, INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [tries, router]);

  return (
    <div className="rounded-xl border border-[#FA4616]/30 bg-white px-4 py-3">
      <Text size="2">
        {tries < MAX_TRIES
          ? "Payment received. Waiting for Whop to activate your subscription..."
          : "Whop is taking longer than usual. Reload the page in a moment."}
      </Text>
    </div>
  );
}
