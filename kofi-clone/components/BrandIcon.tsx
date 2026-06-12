/* eslint-disable @next/next/no-img-element */

const BRAND_ICONS = {
  coffee: "/brand/coffee-cup.webp",
  palette: "/brand/paint-palette.webp",
  megaphone: "/brand/megaphone.webp",
  money: "/brand/money-stack.webp",
  heart: "/brand/heart.webp",
  shop: "/brand/shopping-bag.webp",
  lock: "/brand/lock.webp",
  confetti: "/brand/confetti.webp",
} as const;

export type BrandIconName = keyof typeof BRAND_ICONS;

export default function BrandIcon({
  name,
  className = "h-6 w-6",
  alt = "",
}: {
  name: BrandIconName;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={BRAND_ICONS[name]}
      alt={alt}
      aria-hidden={alt === "" ? true : undefined}
      draggable={false}
      className={`inline-block shrink-0 select-none object-contain ${className}`}
    />
  );
}
