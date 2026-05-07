'use client';

import { useEffect, useState } from 'react';
import { AppHeader } from './AppHeader';

export function NavMarketplace() {
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    fetch('/api/profile/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setIsSeller(!!data.isSeller))
      .catch(() => {});
  }, []);

  return <AppHeader mode="buyer" isSeller={isSeller} showSearch />;
}
