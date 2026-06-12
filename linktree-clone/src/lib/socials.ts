// Social platform metadata. Each entry pairs a stable key (stored in the
// SocialLink table) with a human label, the platform's brand color, and
// the SVG path data sourced from the `simple-icons` package. The path is
// emitted into an inline <svg> at render time, so we never ship the full
// simple-icons CSS / asset bundle to the browser.

import {
  siX,
  siInstagram,
  siYoutube,
  siTiktok,
  siGithub,
  siDiscord,
  siBluesky,
  siThreads,
  siSpotify,
  siTwitch,
  siFacebook,
  siGmail,
  siSubstack,
} from "simple-icons";

export interface SocialPlatform {
  key: string;
  label: string;
  brandColor: string; // hex
  path: string; // SVG path data (no leading hash, just the `d` attribute value)
  // How to compose the link's href from the user-supplied url. Most are
  // pass-through; email becomes a mailto:.
  hrefBuilder?: (url: string) => string;
}

const websiteSvgPath =
  "M12 2a10 10 0 100 20 10 10 0 000-20zm6.93 6h-2.95a15.65 15.65 0 00-1.38-3.56A8.03 8.03 0 0118.93 8zM12 4c.83 1.2 1.48 2.53 1.91 3.94H10.1A11.5 11.5 0 0112 4zM4.26 14a7.86 7.86 0 010-4H7.6a16.6 16.6 0 000 4zm.81 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 015.07 16zm2.95-8H5.07a7.99 7.99 0 014.33-3.56A15.65 15.65 0 008.02 8zM12 20c-.83-1.2-1.48-2.53-1.91-3.94h3.82A11.5 11.5 0 0112 20zm2.34-5.94H9.66a14.5 14.5 0 010-4h4.68a14.5 14.5 0 010 4zm.32 5.5c.6-1.11 1.06-2.31 1.38-3.56h2.95a7.99 7.99 0 01-4.33 3.56zM16.4 14a16.6 16.6 0 000-4h3.34a7.86 7.86 0 010 4z";

export const SOCIALS: readonly SocialPlatform[] = [
  {
    key: "x",
    label: "X",
    brandColor: `#${siX.hex}`,
    path: siX.path,
  },
  {
    key: "instagram",
    label: "Instagram",
    brandColor: `#${siInstagram.hex}`,
    path: siInstagram.path,
  },
  {
    key: "youtube",
    label: "YouTube",
    brandColor: `#${siYoutube.hex}`,
    path: siYoutube.path,
  },
  {
    key: "tiktok",
    label: "TikTok",
    brandColor: `#${siTiktok.hex}`,
    path: siTiktok.path,
  },
  {
    key: "github",
    label: "GitHub",
    brandColor: `#${siGithub.hex}`,
    path: siGithub.path,
  },
  {
    key: "discord",
    label: "Discord",
    brandColor: `#${siDiscord.hex}`,
    path: siDiscord.path,
  },
  {
    key: "bluesky",
    label: "Bluesky",
    brandColor: `#${siBluesky.hex}`,
    path: siBluesky.path,
  },
  {
    key: "threads",
    label: "Threads",
    brandColor: `#${siThreads.hex}`,
    path: siThreads.path,
  },
  {
    key: "spotify",
    label: "Spotify",
    brandColor: `#${siSpotify.hex}`,
    path: siSpotify.path,
  },
  {
    key: "twitch",
    label: "Twitch",
    brandColor: `#${siTwitch.hex}`,
    path: siTwitch.path,
  },
  {
    key: "facebook",
    label: "Facebook",
    brandColor: `#${siFacebook.hex}`,
    path: siFacebook.path,
  },
  {
    key: "substack",
    label: "Substack",
    brandColor: `#${siSubstack.hex}`,
    path: siSubstack.path,
  },
  {
    key: "email",
    label: "Email",
    brandColor: `#${siGmail.hex}`,
    path: siGmail.path,
    hrefBuilder: (url) =>
      url.startsWith("mailto:") ? url : `mailto:${url}`,
  },
  {
    key: "website",
    label: "Website",
    brandColor: "#0a0a0c",
    path: websiteSvgPath,
  },
] as const;

const SOCIAL_BY_KEY: Record<string, SocialPlatform> = Object.fromEntries(
  SOCIALS.map((s) => [s.key, s])
);

export function getSocialPlatform(key: string): SocialPlatform | null {
  return SOCIAL_BY_KEY[key] ?? null;
}

export function isSocialPlatformKey(value: unknown): value is string {
  return typeof value === "string" && value in SOCIAL_BY_KEY;
}
