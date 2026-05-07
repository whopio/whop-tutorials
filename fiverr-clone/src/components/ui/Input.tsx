"use client";

import { forwardRef } from "react";
import { GFInput } from "@/components/gigflow/design-system";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  icon?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, prefix, error, ...props }, ref) => (
    <GFInput
      ref={ref}
      label={label}
      prefix={prefix ?? icon}
      error={error}
      {...props}
    />
  )
);

Input.displayName = "Input";
