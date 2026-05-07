"use client";

import { GFAvatar } from "@/components/gigflow/design-system";

interface AvatarProps {
  src?: string | null;
  displayName?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({
  src,
  displayName,
  name,
  size = "md",
  className,
}: AvatarProps) {
  return (
    <GFAvatar
      src={src ?? undefined}
      name={name ?? displayName ?? undefined}
      size={size}
      className={className}
    />
  );
}
