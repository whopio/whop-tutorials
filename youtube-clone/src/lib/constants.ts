import {
  Home,
  Clapperboard,
  MonitorPlay,
  History,
  ListVideo,
  Clock,
  ThumbsUp,
  Video,
  Flame,
  Music2,
  Gamepad2,
  Newspaper,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Top group of the guide sidebar — always visible. */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Waves", href: "/waves", icon: Clapperboard },
  { label: "Subscriptions", href: "/feed/subscriptions", icon: MonitorPlay },
];

/** The "You" group — personal library shelves. */
export const YOU_NAV: NavItem[] = [
  { label: "History", href: "/feed/history", icon: History },
  { label: "Playlists", href: "/feed/playlists", icon: ListVideo },
  { label: "Your videos", href: "/studio/videos", icon: Video },
  { label: "Watch later", href: "/playlist?list=WL", icon: Clock },
  { label: "Liked videos", href: "/playlist?list=LL", icon: ThumbsUp },
];

/** "Explore" browse categories. */
export const EXPLORE_NAV: NavItem[] = [
  { label: "Trending", href: "/explore/trending", icon: Flame },
  { label: "Music", href: "/explore/music", icon: Music2 },
  { label: "Gaming", href: "/explore/gaming", icon: Gamepad2 },
  { label: "News", href: "/explore/news", icon: Newspaper },
  { label: "Sports", href: "/explore/sports", icon: Trophy },
];

/** Compact 72px rail (and mobile bottom bar) entries. */
export const MINI_NAV: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Waves", href: "/waves", icon: Clapperboard },
  { label: "Subscriptions", href: "/feed/subscriptions", icon: MonitorPlay },
  { label: "You", href: "/feed/you", icon: History },
];
