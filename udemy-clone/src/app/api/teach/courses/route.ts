import { NextResponse } from "next/server";
import { requireAuth, getCreatorProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { slugify } from "@/lib/slugify";
import { z } from "zod";
import { MAX_COURSE_TITLE, MAX_COURSE_DESCRIPTION } from "@/lib/constants";
import { headers } from "next/headers";

const categoryValues = [
  "DEVELOPMENT", "BUSINESS", "DESIGN", "MARKETING",
  "PHOTOGRAPHY", "MUSIC", "HEALTH", "LIFESTYLE",
] as const;

const createCourseSchema = z.object({
  title: z.string().min(3).max(MAX_COURSE_TITLE),
  description: z.string().min(10).max(MAX_COURSE_DESCRIPTION),
  price: z.number().int().min(0),
  category: z.enum(categoryValues),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = rateLimit(`teach:courses:${ip}`, { interval: 60_000, maxRequests: 10 });
  if (limited) return limited;

  const user = await requireAuth({ redirect: false });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getCreatorProfile(user.id);
  if (!profile || !profile.kycComplete) {
    return NextResponse.json({ error: "Complete instructor onboarding first" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, price, category, thumbnailUrl } = parsed.data;

  const course = await prisma.course.create({
    data: {
      title,
      slug: slugify(title),
      description,
      price,
      category,
      thumbnailUrl: thumbnailUrl || null,
      creatorId: profile.id,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ course }, { status: 201 });
}
