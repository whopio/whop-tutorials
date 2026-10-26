export const PLATFORM_FEE_PERCENT = 10;
export const MIN_PRICE_CENTS = 100;
export const MAX_PRICE_CENTS = 100_000;
export const POSTS_PER_PAGE = 10;
export const TRENDING_WRITERS_COUNT = 6;
export const TRENDING_WINDOW_DAYS = 14;
export const TRENDING_WEIGHTS = {
  followers: 1,
  subscribers: 3,
  recentPosts: 2,
} as const;
