"use client";

import { useState } from "react";
import { Badge, Button, Code, Text } from "@whop/react/components";

const TEST_CARD = "4242 4242 4242 4242";

export function TestCardStrip() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border border-dashed border-[#B6B5B0] bg-white/60 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color="orange" variant="soft">
          Sandbox demo
        </Badge>
        <Text size="1" color="gray">
          No real money moves. Pay with the test card
        </Text>
        <Code size="1" variant="soft">
          {TEST_CARD}
        </Code>
        <Button
          type="button"
          size="1"
          variant="ghost"
          color="gray"
          onClick={() => {
            void navigator.clipboard.writeText(TEST_CARD.replaceAll(" ", ""));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="mt-1">
        <Text size="1" color="gray">
          Any future expiry, any CVC, any name. Curious about failure? Try the
          decline card <Code size="1">4000 0000 0000 0002</Code>.
        </Text>
      </div>
    </div>
  );
}
