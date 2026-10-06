"use client";

import { useState } from "react";
import { Badge, Code, Text } from "@whop/react/components";

export interface TestCard {
  number: string;
  simulates: string;
  tone: "green" | "red" | "amber" | "gray";
}

export const TEST_CARDS: TestCard[] = [
  { number: "4242 4242 4242 4242", simulates: "Payment succeeds", tone: "green" },
  { number: "4000 0000 0000 0002", simulates: "Card declined", tone: "red" },
  {
    number: "5385 3083 6013 5181",
    simulates: "Requires 3D Secure",
    tone: "amber",
  },
  {
    number: "4000 0000 0000 0341",
    simulates: "Saves fine, every charge fails",
    tone: "gray",
  },
];

const TONE_COLOR: Record<TestCard["tone"], "green" | "red" | "amber" | "gray"> =
  { green: "green", red: "red", amber: "amber", gray: "gray" };

// The sandbox's four test cards. Any future expiry, any CVC, any name.
export function CardStrip({ highlight }: { highlight?: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-[#B6B5B0] bg-white/60 px-3 py-2.5">
      {TEST_CARDS.map((card) => {
        const active = highlight === card.number;
        return (
          <div
            key={card.number}
            className={[
              "flex flex-wrap items-center gap-2 rounded-md px-1.5 py-1",
              active ? "bg-[#FA4616]/[0.07]" : "",
            ].join(" ")}
          >
            <Code size="1" variant={active ? "solid" : "soft"}>
              {card.number}
            </Code>
            <Badge color={TONE_COLOR[card.tone]} variant="soft" size="1">
              {card.simulates}
            </Badge>
            <button
              type="button"
              className="ml-auto text-[11px] font-medium text-[#151515]/50 transition hover:text-[#151515]"
              onClick={() => {
                void navigator.clipboard.writeText(
                  card.number.replaceAll(" ", ""),
                );
                setCopied(card.number);
                setTimeout(() => setCopied(null), 1500);
              }}
            >
              {copied === card.number ? "Copied" : "Copy"}
            </button>
          </div>
        );
      })}
      <Text size="1" color="gray">
        Any future expiry, any CVC, any name and address.
      </Text>
    </div>
  );
}
