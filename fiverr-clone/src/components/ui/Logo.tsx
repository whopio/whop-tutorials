"use client";

import Link from "next/link";
import { Logo as GFLogo } from "@/components/gigflow/design-system";

interface LogoProps {
  dark?: boolean;
  size?: "sm" | "default" | "lg";
}

export function Logo({ dark = false, size = "default" }: LogoProps) {
  return (
    <Link href="/" className="block">
      <GFLogo dark={dark} size={size} />
    </Link>
  );
}
