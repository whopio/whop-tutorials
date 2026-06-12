"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import BrandIcon from "@/components/BrandIcon";

export type FeaturedCreator = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  accent: string;
  supporters: number;
  tags: string[];
};

const ALL = "All";

export default function CreatorCategories({ creators }: { creators: FeaturedCreator[] }) {
  // Build the pill row from the categories that actually have creators, so every
  // pill returns at least one result (no dead tabs).
  const categories = Array.from(new Set(creators.flatMap((c) => c.tags))).slice(0, 9);
  const [active, setActive] = useState(ALL);

  const shown = active === ALL ? creators : creators.filter((c) => c.tags.includes(active));
  const tabs = [ALL, ...categories];

  return (
    <>
      {categories.length > 0 ? (
        <div className="mb-8 flex flex-wrap justify-center gap-2.5">
          {tabs.map((tab) => {
            const isActive = tab === active;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActive(tab)}
                aria-pressed={isActive}
                className={[
                  "rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition",
                  isActive
                    ? "border-ink bg-surface text-ink"
                    : "border-transparent bg-surface-2 text-ink hover:brightness-95",
                ].join(" ")}
              >
                {tab}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {shown.map((c) => (
          <Link
            key={c.username}
            href={`/${c.username}`}
            className="kofi-card flex flex-col items-center p-5 text-center transition-[filter] hover:brightness-[0.98]"
          >
            <div
              className={`grid h-16 w-16 place-items-center overflow-hidden rounded-full ${c.avatarUrl ? "" : "bg-surface-2"}`}
              style={c.avatarUrl ? { background: c.accent } : undefined}
            >
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <BrandIcon name="coffee" className="h-10 w-10" />
              )}
            </div>
            <p className="mt-3 w-full truncate font-semibold">{c.displayName}</p>
            <p className="mt-0.5 text-xs text-muted">
              {c.supporters} {c.supporters === 1 ? "supporter" : "supporters"}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
