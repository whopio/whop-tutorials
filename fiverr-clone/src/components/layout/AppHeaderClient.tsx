'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppHeader } from './AppHeader';

export function AppHeaderClient() {
  const pathname = usePathname() ?? '';
  const mode = pathname.startsWith('/sell') ? 'seller' : 'buyer';
  const [isSeller, setIsSeller] = useState(mode === 'seller');

  useEffect(() => {
    if (mode === 'seller') {
      setIsSeller(true);
      return;
    }
    fetch('/api/profile/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setIsSeller(!!data.isSeller))
      .catch(() => setIsSeller(false));
  }, [mode]);

  return <AppHeader mode={mode} isSeller={isSeller} showSearch={mode === 'buyer'} pathname={pathname} />;
}
