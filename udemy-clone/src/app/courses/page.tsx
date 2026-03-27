import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { COURSES_PER_PAGE } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { Star, Users } from "lucide-react";
import type { Category } from "@/generated/prisma/client";

const CATEGORIES = [
  "DEVELOPMENT", "BUSINESS", "DESIGN", "MARKETING",
  "PHOTOGRAPHY", "MUSIC", "HEALTH", "LIFESTYLE",
] as const;

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const { q, category, page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const where = {
    status: "PUBLISHED" as const,
    ...(category && CATEGORIES.includes(category as Category) && { category: category as Category }),
    ...(q && { title: { contains: q, mode: "insensitive" as const } }),
  };

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        creator: { include: { user: true } },
        _count: { select: { enrollments: true } },
        reviews: { select: { rating: true } },
        sections: { include: { _count: { select: { lessons: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * COURSES_PER_PAGE,
      take: COURSES_PER_PAGE,
    }),
    prisma.course.count({ where }),
  ]);

  const totalPages = Math.ceil(total / COURSES_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <h1 className="text-3xl font-bold tracking-tight mb-10">Browse Courses</h1>

      <form className="mb-10 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search courses..."
          className="flex-1 px-5 py-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
        />
        <select
          name="category"
          defaultValue={category}
          className="px-5 py-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0) + c.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <button type="submit" className="px-8 py-3.5 rounded-lg bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)]">
          Search
        </button>
      </form>

      {courses.length === 0 ? (
        <p className="text-[var(--color-text-secondary)] text-center py-20">No courses found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => {
            const avgRating =
              course.reviews.length > 0
                ? course.reviews.reduce((sum, r) => sum + r.rating, 0) / course.reviews.length
                : 0;
            const lessonCount = course.sections.reduce(
              (sum, s) => sum + s._count.lessons,
              0
            );

            return (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                className="group rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden hover:shadow-lg hover:shadow-black/20 hover:border-[var(--color-surface-elevated)]"
              >
                <div className="relative aspect-video bg-[var(--color-surface-elevated)]">
                  {course.thumbnailUrl && (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/70 text-white backdrop-blur-sm">
                    {formatPrice(course.price)}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 mb-2 group-hover:text-[var(--color-accent)]">
                    {course.title}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                    {course.creator.user.name || "Instructor"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                    {avgRating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                        {avgRating.toFixed(1)} ({course.reviews.length})
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {course._count.enrollments}
                    </span>
                    <span>{lessonCount} lessons</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-12">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/courses?${new URLSearchParams({
                ...(q && { q }),
                ...(category && { category }),
                page: String(p),
              })}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                p === page
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
