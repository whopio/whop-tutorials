import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pickRandomSuffix(length = 4): string {
  return String(Math.floor(Math.random() * 9 * 10 ** (length - 1)) + 10 ** (length - 1));
}

export function generateUsername(seed: string | null | undefined) {
  const base = (seed || "writer").toLowerCase().replace(/[^a-z0-9]/g, "") || "writer";
  return `${base}${pickRandomSuffix()}`;
}
