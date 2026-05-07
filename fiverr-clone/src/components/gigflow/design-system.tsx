"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Zap, Star } from "lucide-react";
import { C } from "@/lib/design-tokens";

export { C };

// ─── Logo ───────────────────────────────────────────────────────────────────
export const Logo = ({
  dark = false,
  size = "default",
}: {
  dark?: boolean;
  size?: "sm" | "default" | "lg";
}) => {
  const sizes = {
    sm: { box: 26, icon: 14, text: "text-base" },
    default: { box: 32, icon: 18, text: "text-xl" },
    lg: { box: 40, icon: 22, text: "text-2xl" },
  };
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2 select-none">
      <div
        className="rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          width: s.box,
          height: s.box,
          background: `linear-gradient(135deg, ${C.brandLight}, ${C.brand})`,
        }}
      >
        <Zap size={s.icon} color="white" strokeWidth={2.5} />
      </div>
      <span
        className={cn(s.text, "tracking-tight font-bold")}
        style={{
          color: dark ? C.white : C.ink,
          fontFamily: "var(--font-sans)",
          letterSpacing: "-0.03em",
        }}
      >
        gigflow
      </span>
    </div>
  );
};

// ─── GFButton ───────────────────────────────────────────────────────────────
interface GFButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "brand" | "dark" | "ghost" | "outline" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconLeft?: React.ReactNode;
}

export const GFButton = React.forwardRef<HTMLButtonElement, GFButtonProps>(
  (
    {
      children,
      variant = "brand",
      size = "md",
      loading,
      icon,
      iconLeft,
      className,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 cursor-pointer rounded-xl select-none disabled:opacity-50";
    const variants = {
      brand: "text-white shadow-sm hover:shadow-md active:scale-[0.98]",
      dark: "text-white hover:opacity-90 active:scale-[0.98]",
      ghost: "hover:bg-black/5 active:bg-black/10",
      outline: "border hover:bg-black/5",
      danger: "text-white hover:opacity-90",
    };
    const sizeMap = {
      xs: "px-3 py-1.5 text-xs",
      sm: "px-4 py-2 text-sm",
      md: "px-5 py-2.5 text-sm",
      lg: "px-7 py-3.5 text-base",
    };
    const bgMap = {
      brand: {
        background: `linear-gradient(135deg, ${C.brandLight}, ${C.brand})`,
      },
      dark: { backgroundColor: C.ink },
      ghost: { backgroundColor: "transparent" },
      outline: {
        backgroundColor: "transparent",
        borderColor: C.border,
        color: C.ink,
      },
      danger: { backgroundColor: C.error },
    };
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizeMap[size], className)}
        style={bgMap[variant]}
        {...props}
      >
        {iconLeft}
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          children
        )}
        {icon}
      </button>
    );
  }
);
GFButton.displayName = "GFButton";

// ─── GFBadge ────────────────────────────────────────────────────────────────
export const GFBadge = ({
  children,
  variant = "default",
  dot,
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "brand" | "success" | "warning" | "error" | "dark";
  dot?: boolean;
  className?: string;
}) => {
  const map = {
    default: { bg: C.surface, color: C.muted, border: C.border },
    brand: { bg: C.brandMuted, color: C.brand, border: "transparent" },
    success: { bg: "#D1FAE5", color: "#059669", border: "transparent" },
    warning: { bg: "#FEF3C7", color: "#D97706", border: "transparent" },
    error: { bg: "#FEE2E2", color: "#DC2626", border: "transparent" },
    dark: { bg: C.ink, color: C.white, border: "transparent" },
  };
  const s = map[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        className
      )}
      style={{
        backgroundColor: s.bg,
        color: s.color,
        borderColor: s.border,
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: s.color }}
        />
      )}
      {children}
    </span>
  );
};

// ─── GFInput ─────────────────────────────────────────────────────────────────
interface GFInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: string;
}
export const GFInput = React.forwardRef<HTMLInputElement, GFInputProps>(
  ({ label, prefix, suffix, error, className, ...props }, ref) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label && (
      <label className="text-sm font-medium" style={{ color: C.ink }}>
        {label}
      </label>
    )}
    <div className="relative flex items-center">
      {prefix && (
        <span
          className="absolute left-3 flex items-center"
          style={{ color: C.muted }}
        >
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2",
          prefix ? "pl-9" : "pl-3.5",
          suffix ? "pr-9" : "pr-3.5"
        )}
        style={
          {
            borderColor: error ? C.error : C.border,
            backgroundColor: C.white,
            color: C.ink,
            "--tw-ring-color": C.brand,
          } as React.CSSProperties
        }
        {...props}
      />
      {suffix && (
        <span
          className="absolute right-3 flex items-center"
          style={{ color: C.muted }}
        >
          {suffix}
        </span>
      )}
    </div>
    {error && (
      <p className="text-xs" style={{ color: C.error }}>
        {error}
      </p>
    )}
  </div>
));
GFInput.displayName = "GFInput";

// ─── GFTextarea ───────────────────────────────────────────────────────────────
interface GFTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
export const GFTextarea = ({
  label,
  className,
  ...props
}: GFTextareaProps) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label && (
      <label className="text-sm font-medium" style={{ color: C.ink }}>
        {label}
      </label>
    )}
    <textarea
      className="w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 resize-none"
      style={
        {
          borderColor: C.border,
          backgroundColor: C.white,
          color: C.ink,
          "--tw-ring-color": C.brand,
        } as React.CSSProperties
      }
      rows={4}
      {...props}
    />
  </div>
);

// ─── GFCard ──────────────────────────────────────────────────────────────────
export const GFCard = ({
  children,
  className,
  hover = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) => (
  <div
    className={cn(
      "rounded-2xl border transition-all",
      hover && "hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
      className
    )}
    style={{ backgroundColor: C.white, borderColor: C.border }}
    {...props}
  >
    {children}
  </div>
);

// ─── Section Heading ─────────────────────────────────────────────────────────
export const SectionHeading = ({
  label,
  title,
  description,
}: {
  label?: string;
  title: string;
  description?: string;
}) => (
  <div className="flex flex-col gap-1 mb-8">
    {label && (
      <span
        className="text-xs font-mono uppercase tracking-widest"
        style={{ color: C.brand }}
      >
        {label}
      </span>
    )}
    <h2
      className="text-2xl font-bold tracking-tight"
      style={{ color: C.ink }}
    >
      {title}
    </h2>
    {description && (
      <p className="text-sm" style={{ color: C.muted }}>
        {description}
      </p>
    )}
  </div>
);

// ─── Status Pill ─────────────────────────────────────────────────────────────
export const statusConfig = {
  active: { label: "Active", variant: "success" as const, dot: true },
  awaiting_requirements: { label: "Awaiting Info", variant: "brand" as const, dot: true },
  in_progress: { label: "In Progress", variant: "brand" as const, dot: true },
  revision_requested: { label: "Revision", variant: "warning" as const, dot: true },
  delivered: { label: "Delivered", variant: "warning" as const, dot: true },
  completed: { label: "Completed", variant: "success" as const, dot: true },
  cancelled: { label: "Cancelled", variant: "error" as const, dot: true },
  revision: { label: "Revision", variant: "warning" as const, dot: true },
  pending: { label: "Pending Review", variant: "warning" as const, dot: true },
  flagged: { label: "Flagged", variant: "error" as const, dot: true },
  disputed: { label: "Disputed", variant: "error" as const, dot: true },
  paused: { label: "Paused", variant: "default" as const, dot: true },
};

export const StatusPill = ({
  status,
}: {
  status: keyof typeof statusConfig;
}) => {
  const cfg = statusConfig[status];
  return (
    <GFBadge variant={cfg.variant} dot>
      {cfg.label}
    </GFBadge>
  );
};

// ─── Avatar ──────────────────────────────────────────────────────────────────
export const GFAvatar = ({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) => {
  const sizeMap = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-20 h-20 text-xl",
  };
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";
  return (
    <div
      className={cn(
        "rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-semibold",
        sizeMap[size],
        className
      )}
      style={{ backgroundColor: C.brandMuted, color: C.brand }}
    >
      {src ? (
        <img src={src} alt={name || "avatar"} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
};

// ─── Divider ─────────────────────────────────────────────────────────────────
export const GFDivider = ({ label }: { label?: string }) => (
  <div className="flex items-center gap-3 my-2">
    <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
    {label && (
      <span className="text-xs font-medium" style={{ color: C.muted }}>
        {label}
      </span>
    )}
    <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
  </div>
);

// ─── Star Rating ─────────────────────────────────────────────────────────────
export const StarRating = ({
  rating,
  count,
  size = 14,
}: {
  rating: number;
  count?: number;
  size?: number;
}) => (
  <span className="inline-flex items-center gap-1">
    <Star size={size} fill={C.brand} color={C.brand} />
    <span className="font-semibold text-sm" style={{ color: C.ink }}>
      {rating.toFixed(1)}
    </span>
    {count !== undefined && (
      <span className="text-sm" style={{ color: C.muted }}>
        ({count.toLocaleString()})
      </span>
    )}
  </span>
);

// ─── Toggle Switch ───────────────────────────────────────────────────────────
export const GFToggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) => (
  <label className="flex items-center justify-between cursor-pointer">
    {label && (
      <span className="text-sm" style={{ color: C.ink }}>
        {label}
      </span>
    )}
    <div
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
      style={{ backgroundColor: checked ? C.brand : C.border }}
    >
      <div
        className={cn(
          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all",
          checked ? "left-[22px]" : "left-0.5"
        )}
      />
    </div>
  </label>
);

// ─── Progress Bar ────────────────────────────────────────────────────────────
export const GFProgress = ({
  value,
  label,
  max = 100,
}: {
  value: number;
  label?: string;
  max?: number;
}) => (
  <div className="flex flex-col gap-1">
    {label && (
      <div
        className="flex items-center justify-between text-xs"
        style={{ color: C.muted }}
      >
        <span>{label}</span>
        <span>{Math.round((value / max) * 100)}%</span>
      </div>
    )}
    <div
      className="w-full h-1.5 rounded-full overflow-hidden"
      style={{ backgroundColor: C.surfaceAlt }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.min(100, (value / max) * 100)}%`,
          background: `linear-gradient(90deg, ${C.brand}, ${C.brandLight})`,
        }}
      />
    </div>
  </div>
);
