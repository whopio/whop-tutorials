"use client";

import { forwardRef } from "react";
import { GFButton } from "@/components/gigflow/design-system";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  iconLeft?: React.ReactNode;
  loading?: boolean;
  asChild?: boolean;
}

const variantMap: Record<ButtonVariant, "brand" | "dark" | "ghost" | "outline" | "danger"> = {
  primary: "brand",
  secondary: "outline",
  ghost: "ghost",
  outline: "outline",
  danger: "danger",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      icon,
      iconLeft,
      loading,
      asChild,
      ...props
    },
    ref
  ) => {
    const gfVariant = variantMap[variant];
    return (
      <GFButton
        ref={ref}
        variant={gfVariant}
        size={size === "lg" ? "lg" : size === "sm" ? "sm" : "md"}
        icon={icon}
        iconLeft={iconLeft}
        loading={loading}
        {...props}
      >
        {children}
      </GFButton>
    );
  }
);

Button.displayName = "Button";
