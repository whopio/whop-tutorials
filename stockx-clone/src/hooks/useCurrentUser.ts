"use client";

import { useState, useEffect } from "react";

interface CurrentUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  connectedAccountId: string | null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { user, isLoading };
}
