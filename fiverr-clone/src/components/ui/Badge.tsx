"use client";

import { GFBadge } from "@/components/gigflow/design-system";

type BadgeVariant = "default" | "success" | "warning" | "error" | "primary";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const variantMap: Record<BadgeVariant, "default" | "brand" | "success" | "warning" | "error" | "dark"> = {
  default: "default",
  success: "success",
  warning: "warning",
  error: "error",
  primary: "brand",
};

export function Badge({
  children,
  variant = "default",
  dot,
  className,
}: BadgeProps) {
  return (
    <GFBadge variant={variantMap[variant]} dot={dot} className={className}>
      {children}
    </GFBadge>
  );
}
