"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@whop/react/components";

export default function FollowButton({
  username,
  initialFollowing,
  isLoggedIn,
}: {
  username: string;
  initialFollowing: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!isLoggedIn) {
      window.location.href = `/api/auth/login?returnTo=/${username}`;
      return;
    }
    setLoading(true);
    const optimistic = !following;
    setFollowing(optimistic);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (typeof data.following === "boolean") setFollowing(data.following);
      router.refresh();
    } catch {
      setFollowing(!optimistic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={toggle} disabled={loading} size="2" variant="soft" color="gray">
      {following ? "Following" : "Follow"}
    </Button>
  );
}
