"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EARN_GOALS, CREATOR_CATEGORIES } from "@/constants";
import { Button } from "@whop/react/components";
import BrandIcon from "@/components/BrandIcon";
import { ChevronLeft } from "@/components/Icons";

type Role = "creator" | "supporter";

function pillClass(active: boolean) {
  return [
    "rounded-full border px-4 py-2 text-sm font-semibold transition",
    active ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand/60",
  ].join(" ");
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function OnboardingWizard({
  email,
  defaultName,
  defaultUsername,
}: {
  email?: string;
  defaultName?: string;
  defaultUsername?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [earnGoals, setEarnGoals] = useState<string[]>([]);
  const [username, setUsername] = useState(
    (defaultUsername ?? "").toLowerCase().replace(/[^a-z0-9_]/g, ""),
  );
  const [interests, setInterests] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState(defaultName ?? "");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<{
    status: "idle" | "checking" | "available" | "unavailable";
    message?: string;
  }>({ status: "idle" });

  // Check handle availability (debounced) while on the username step, so "Next"
  // only enables for a free, valid handle and the "taken" error never surfaces
  // later on the About you step.
  useEffect(() => {
    if (step !== 3) return;
    const handle = username;
    if (handle.length < 3) {
      setAvailability({ status: "idle" });
      return;
    }
    setAvailability({ status: "checking" });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/creator/username?username=${encodeURIComponent(handle)}`,
          { signal: controller.signal },
        );
        const data: { available?: boolean; reason?: string } = await res.json();
        setAvailability(
          data.available
            ? { status: "available" }
            : { status: "unavailable", message: data.reason ?? "That username is taken" },
        );
      } catch {
        if (!controller.signal.aborted) setAvailability({ status: "idle" });
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username, step]);

  function chooseRole(role: Role) {
    if (role === "supporter") {
      router.push("/feed");
      return;
    }
    setStep(2);
  }

  function goToInterests() {
    if (availability.status !== "available") return;
    setError(null);
    setStep(4);
  }

  async function createPage() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName, bio, tags: interests }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      router.push(`/${data.username}`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  // Step 1 — role selection
  if (step === 1) {
    return (
      <div className="kofi-card p-7">
        <h1 className="text-2xl">I&rsquo;m a&hellip;</h1>
        <p className="mt-1 text-sm text-muted">
          {email ? (
            <>
              Signing up as <span className="font-semibold text-ink">{email}</span>.
            </>
          ) : (
            "Tell us how you’ll use Cuppa."
          )}
        </p>
        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => chooseRole("creator")}
            className="flex items-center gap-4 rounded-2xl border border-muted/30 bg-surface p-5 text-left transition hover:border-brand hover:bg-surface-2"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2">
              <BrandIcon name="palette" className="h-7 w-7" />
            </span>
            <span>
              <span className="block font-bold">Creator</span>
              <span className="block text-sm text-muted">
                I want a page to accept tips, memberships and sales.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => chooseRole("supporter")}
            className="flex items-center gap-4 rounded-2xl border border-muted/30 bg-surface p-5 text-left transition hover:border-brand hover:bg-surface-2"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2">
              <BrandIcon name="coffee" className="h-7 w-7" />
            </span>
            <span>
              <span className="block font-bold">Supporter</span>
              <span className="block text-sm text-muted">
                I&rsquo;m here to support and follow creators I love.
              </span>
            </span>
          </button>
        </div>
        <a
          href="/api/auth/logout"
          className="mt-6 block text-center text-sm text-muted hover:text-ink"
        >
          Start over
        </a>
      </div>
    );
  }

  // Step 2 — earn goals (UI only)
  if (step === 2) {
    return (
      <div className="kofi-card p-7">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl">How are you planning to earn?</h1>
        <p className="mt-1 text-sm text-muted">Pick what fits. You can offer all of it later.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {EARN_GOALS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setEarnGoals(toggle(earnGoals, g))}
              className={pillClass(earnGoals.includes(g))}
            >
              {g}
            </button>
          ))}
        </div>
        <Button onClick={() => setStep(3)} size="3" variant="solid" color="gray" highContrast className="mt-8 w-full">
          Continue
        </Button>
      </div>
    );
  }

  // Step 3 — username
  if (step === 3) {
    return (
      <div className="kofi-card p-7">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl">Pick a username</h1>
        <p className="mt-1 text-sm text-muted">This is your page link. You can change it later.</p>
        <div className="mt-6 flex items-center rounded-xl border border-line bg-surface px-4 py-3 focus-within:border-brand">
          <span className="text-muted">cuppa.com/</span>
          <input
            autoFocus
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
            placeholder="yourname"
            className="flex-1 bg-transparent outline-none"
          />
        </div>
        <p className="mt-2 min-h-[1.25rem] text-sm">
          {username.length > 0 && username.length < 3 ? (
            <span className="text-muted">At least 3 characters.</span>
          ) : availability.status === "checking" ? (
            <span className="text-muted">Checking availability&hellip;</span>
          ) : availability.status === "available" ? (
            <span className="text-positive">cuppa.com/{username} is available</span>
          ) : availability.status === "unavailable" ? (
            <span className="text-red-600">{availability.message}</span>
          ) : null}
        </p>
        <Button
          onClick={goToInterests}
          disabled={availability.status !== "available"}
          size="3"
          variant="solid"
          color="gray"
          highContrast
          className="mt-8 w-full"
        >
          Next
        </Button>
      </div>
    );
  }

  // Step 4 — interests
  if (step === 4) {
    return (
      <div className="kofi-card p-7">
        <button
          type="button"
          onClick={() => setStep(3)}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl">Choose your interests</h1>
        <p className="mt-1 text-sm text-muted">
          We use these to describe your page. Pick a few that match your work.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {CREATOR_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setInterests(toggle(interests, c))}
              className={pillClass(interests.includes(c))}
            >
              {c}
            </button>
          ))}
        </div>
        <Button onClick={() => setStep(5)} size="3" variant="solid" color="gray" highContrast className="mt-8 w-full">
          Next
        </Button>
      </div>
    );
  }

  // Step 5 — about you
  return (
    <div className="kofi-card p-7">
      <button
        type="button"
        onClick={() => setStep(4)}
        className="mb-4 text-sm text-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl">About you</h1>
      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="displayName">
            Display name
          </label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Anje's Art"
            className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="bio">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Introduce yourself so others can get to know you…"
            className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-2.5 outline-none focus:border-brand"
          />
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-600">
          {error} {error.toLowerCase().includes("username") ? "Go back to change it." : null}
        </p>
      ) : null}
      <Button
        onClick={createPage}
        disabled={loading || !displayName.trim()}
        size="3"
        variant="solid"
        color="gray"
        highContrast
        className="mt-8 w-full"
      >
        {loading ? "Setting up your page…" : "Next"}
      </Button>
      <p className="mt-3 text-center text-xs text-muted">
        We create a secure payments account so supporters pay you directly.
      </p>
    </div>
  );
}
