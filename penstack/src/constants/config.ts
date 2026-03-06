/** Platform fee percentage taken from each subscription payment */
export const PLATFORM_FEE_PERCENT = 10;

/** Minimum monthly subscription price in cents ($1.00) */
export const MIN_PRICE_CENTS = 100;

/** Maximum monthly subscription price in cents ($1,000.00) */
export const MAX_PRICE_CENTS = 100_000;

/** Number of posts per page in feeds */
export const POSTS_PER_PAGE = 10;

/** Number of trending writers shown on explore page */
export const TRENDING_WRITERS_COUNT = 6;

/** Days to look back for "recent posts" in trending score */
export const TRENDING_WINDOW_DAYS = 14;

/** Trending score weights */
export const TRENDING_WEIGHTS = {
  followers: 1,
  subscribers: 3,
  recentPosts: 2,
} as const;

/** Max file upload sizes */
export const MAX_AVATAR_SIZE = "2MB";
export const MAX_BANNER_SIZE = "4MB";
export const MAX_COVER_IMAGE_SIZE = "4MB";
export const MAX_EDITOR_IMAGE_SIZE = "4MB";
