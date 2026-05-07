'use client';

import { usePathname } from 'next/navigation';
import { NavbarClient } from './Navbar';

export function NavAccount() {
  const pathname = usePathname() ?? '';
  const mode = pathname.startsWith('/sell') ? 'seller' : 'buyer';
  return <NavbarClient mode={mode} pathname={pathname} />;
}
