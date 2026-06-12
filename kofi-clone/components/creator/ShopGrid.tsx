/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/fees";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import { Button } from "@whop/react/components";
import BrandIcon from "@/components/BrandIcon";

type Product = {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  salesCount: number;
};

export default function ShopGrid({
  products,
  creatorUsername,
  creatorDisplayName,
  accentColor,
  sandbox,
}: {
  products: Product[];
  creatorUsername: string;
  creatorDisplayName: string;
  accentColor: string;
  sandbox: boolean;
}) {
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  const body = useMemo(
    () => ({ kind: "shop", creatorUsername, productId: activeProductId }),
    [creatorUsername, activeProductId],
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const isFree = product.priceCents === 0;
          return (
            <div key={product.id} className="kofi-card flex flex-col overflow-hidden">
              <div className="aspect-square w-full bg-surface-2">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center"><BrandIcon name="shop" className="h-20 w-20" /></div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-semibold">{product.title}</h3>
                {product.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{product.description}</p>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{isFree ? "Free" : formatUsd(product.priceCents)}</p>
                    <p className="text-xs text-muted">
                      {product.salesCount} {product.salesCount === 1 ? "sold" : "sold"}
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveProductId(product.id)}
                    size="2"
                    variant="solid"
                    className="shrink-0"
                  >
                    {isFree ? "Get" : "Buy"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CheckoutModal
        open={activeProductId !== null}
        onClose={() => setActiveProductId(null)}
        body={body}
        creatorUsername={creatorUsername}
        creatorDisplayName={creatorDisplayName}
        accentColor={accentColor}
        sandbox={sandbox}
      />
    </>
  );
}
