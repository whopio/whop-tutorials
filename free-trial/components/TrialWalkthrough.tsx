"use client";

import { useState } from "react";
import { Badge, Button, Heading, Text } from "@whop/react/components";
import { StepProgress } from "@/components/StepProgress";
import { TrialCheckoutModal } from "@/components/TrialCheckoutModal";
import { products, type DemoProduct } from "@/constants/products";

// Steps 1-2 of the walkthrough: select a product (the foil errors because
// one-time products can't be trialed), then see its details and open the
// checkout. Step 3 is server-rendered once the trial starts.
export function TrialWalkthrough({
  environment,
  returnUrl,
}: {
  environment: "production" | "sandbox";
  returnUrl: string;
}) {
  const [phase, setPhase] = useState<"select" | "details">("select");
  const [selected, setSelected] = useState<DemoProduct | null>(null);
  const [foilError, setFoilError] = useState<DemoProduct | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  function pick(product: DemoProduct) {
    if (product.trialDays === null) {
      setFoilError(product);
      return;
    }
    setFoilError(null);
    setSelected(product);
    setPhase("details");
  }

  return (
    <div className="flex flex-col gap-5">
      <StepProgress current={phase === "select" ? 1 : 2} />

      <div className="rounded-xl border border-[#E5E4E0] bg-white p-5 shadow-sm">
        {phase === "select" ? (
          <div className="flex flex-col gap-4">
            <div>
              <Heading size="4">Pick a product to try</Heading>
              <Text size="2" color="gray" as="p">
                Only recurring plans can carry a trial.
              </Text>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((product) => {
                const trial = product.trialDays !== null;
                return (
                  <button
                    key={product.key}
                    type="button"
                    onClick={() => pick(product)}
                    className={[
                      "group flex flex-col gap-3 rounded-xl border-2 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                      trial
                        ? "border-[#FA4616] bg-[#FA4616]/[0.05] hover:bg-[#FA4616]/[0.09]"
                        : "border-[#E5E4E0] bg-[#FAFAF9] hover:border-[#B6B5B0] hover:bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Text size="3" weight="bold">
                        {product.name}
                      </Text>
                      <Badge
                        color={trial ? "orange" : "gray"}
                        variant={trial ? "solid" : "soft"}
                        size="1"
                      >
                        {trial ? "Free trial" : "One-time"}
                      </Badge>
                    </div>
                    <Text size="2" weight="medium">
                      {product.priceLabel}
                    </Text>
                    <span
                      className={[
                        "mt-1 text-xs font-semibold transition-transform group-hover:translate-x-0.5",
                        trial ? "text-[#D13415]" : "text-[#151515]/45",
                      ].join(" ")}
                    >
                      {trial ? "Start trial →" : "Select →"}
                    </span>
                  </button>
                );
              })}
            </div>

            {foilError && (
              <div className="rounded-lg border border-[#E5484D]/30 bg-[#E5484D]/5 px-4 py-3">
                <Text size="2" color="red" as="p">
                  {foilError.name} is a one-time purchase. Whop free trials only
                  work on recurring plans, so there is nothing to trial here.
                  Pick the product with a free trial.
                </Text>
              </div>
            )}
          </div>
        ) : selected ? (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => {
                setPhase("select");
                setSelected(null);
              }}
              className="self-start text-xs font-medium text-[#151515]/60 hover:text-[#151515]"
            >
              &larr; Back to products
            </button>

            <div className="flex items-center justify-between gap-2">
              <Heading size="5">{selected.name}</Heading>
              <Badge color="orange" variant="soft">
                {selected.trialDays} days free
              </Badge>
            </div>
            <Text size="2" color="gray" as="p">
              {selected.tagline}
            </Text>

            <ul className="flex flex-col gap-1.5">
              {selected.bullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-2">
                  <Text size="2" color="green">
                    ✓
                  </Text>
                  <Text size="2">{bullet}</Text>
                </li>
              ))}
            </ul>

            <div className="rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] px-4 py-3">
              <Text size="2" weight="medium">
                {selected.priceLabel}
              </Text>
              <div className="mt-0.5">
                <Text size="1" color="gray">
                  No charge today. First charge when the trial ends.
                </Text>
              </div>
            </div>

            <Button
              type="button"
              size="3"
              onClick={() => setCheckoutOpen(true)}
            >
              Start free trial
            </Button>
          </div>
        ) : null}
      </div>

      {selected && (
        <TrialCheckoutModal
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          product={selected}
          environment={environment}
          returnUrl={returnUrl}
        />
      )}
    </div>
  );
}
