"use client";

import type { ReactNode } from "react";
import { Text } from "@whop/react/components";

// The industry dropdown holds two thousand options, which is more than a
// Radix listbox wants to render, so the inputs here are native elements with
// the panel's own styling rather than Frosted form components.
const CONTROL =
  "w-full rounded-lg border bg-white px-2.5 py-1.5 text-[13px] text-[#151515] outline-none transition focus:border-[#FA4616] focus:ring-2 focus:ring-[#FA4616]/15 disabled:bg-[#F6F5F3] disabled:text-[#9A9993]";

function ring(flagged?: boolean): string {
  return flagged ? "border-[#D93900] bg-[#FFF6F3]" : "border-[#E5E4E0]";
}

export function Field({
  label,
  hint,
  flagged,
  children,
}: {
  label: string;
  hint?: string;
  flagged?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline gap-1.5">
        <Text size="1" weight="medium" as="span">
          {label}
        </Text>
        {hint && (
          <Text size="1" color="gray" as="span">
            {hint}
          </Text>
        )}
        {flagged && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#D93900]">
            Whop flagged this
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  flagged,
  disabled,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  flagged?: boolean;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`${CONTROL} ${ring(flagged)}`}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  flagged,
  disabled,
  groups,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
  groups?: Array<{ label: string; options: Array<{ value: string; label: string }> }>;
  flagged?: boolean;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={`${CONTROL} ${ring(flagged)}`}
    >
      {options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      {groups?.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  detail,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  detail: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#E5E4E0] bg-white p-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#FA4616]"
      />
      <span className="min-w-0">
        <Text size="2" weight="medium" as="div">
          {label}
        </Text>
        <Text size="1" color="gray" as="div" className="mt-0.5">
          {detail}
        </Text>
      </span>
    </label>
  );
}
