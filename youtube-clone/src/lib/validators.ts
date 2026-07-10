import { z } from "zod";

/** Visibility + category values mirror the Prisma enums (schema.prisma). */
export const VISIBILITIES = ["PUBLIC", "UNLISTED", "PRIVATE"] as const;
export const CATEGORIES = [
  "MUSIC",
  "GAMING",
  "NEWS",
  "SPORTS",
  "COMEDY",
  "EDUCATION",
  "ENTERTAINMENT",
  "TECH",
  "PODCASTS",
  "COOKING",
  "OTHER",
] as const;

/**
 * CHANNEL-2: a unique, lowercase @handle. We accept an optional leading "@",
 * lowercase it, and allow letters, digits, underscore, dot, and hyphen.
 */
export const handleSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, "").toLowerCase())
  .pipe(
    z
      .string()
      .min(3, "Handle must be at least 3 characters")
      .max(30, "Handle must be 30 characters or fewer")
      .regex(
        /^[a-z0-9_.-]+$/,
        "Use only letters, numbers, and . _ -",
      ),
  );

export const createChannelSchema = z.object({
  name: z.string().trim().min(1, "Add a channel name").max(50),
  handle: handleSchema,
});

/** CHANNEL-6/7: editable channel profile (name, @handle, bio, avatar, banner). */
export const updateChannelSchema = z.object({
  name: z.string().trim().min(1, "Add a channel name").max(50),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  handle: handleSchema,
  avatarUrl: z.url().optional().or(z.literal("")),
  bannerUrl: z.url().optional().or(z.literal("")),
});

/** VIDEO-5: Zod-validated upload metadata. */
export const videoMetaSchema = z.object({
  title: z.string().trim().min(1, "Add a title").max(100),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  visibility: z.enum(VISIBILITIES).default("PUBLIC"),
  category: z.enum(CATEGORIES).default("OTHER"),
  // MEMBERSHIP-6 / VIDEO-11: playback restricted to active channel members.
  membersOnly: z.boolean().default(false),
  // VIDEO-10: vertical short-form clip; lives in the Shorts feed, not the grid.
  isShort: z.boolean().default(false),
});

/**
 * Payload the client sends after a Vercel Blob upload finishes. The Blob URLs
 * are produced by the browser-direct upload; we validate them as our own
 * blob-store URLs before persisting.
 */
const blobUrl = z
  .url()
  .refine(
    (u) => u.includes(".blob.vercel-storage.com"),
    "Expected a Vercel Blob URL",
  );

export const createVideoSchema = videoMetaSchema.extend({
  videoUrl: blobUrl,
  videoPathname: z.string().min(1),
  thumbnailUrl: blobUrl.optional(),
  // The browser reports a fractional duration (e.g. 5.31s); we accept any
  // non-negative number here and round to whole seconds when persisting.
  durationSeconds: z.number().min(0).max(60 * 60 * 12),
});

/** VIDEO-7: editing reuses the metadata schema, keyed by video id. */
export const updateVideoSchema = videoMetaSchema.extend({
  id: z.string().min(1),
});

/** SOCIAL-6: a comment (or reply) body. */
export const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Write something")
  .max(10000);

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
