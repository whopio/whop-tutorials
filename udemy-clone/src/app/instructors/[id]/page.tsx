import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { Star, Users, BookOpen } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await prisma.creatorProfile.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!profile) return { title: "Instructor Not Found" };
  return {
    title: `${profile.user.name || "Instructor"} | Courstar`,
    description: profile.bio || `Courses by ${profile.user.name}`,
  };
}

export default async function InstructorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profile = await prisma.creatorProfile.findUnique({
    where: { id },
    include: {
      user: true,
      courses: {
        where: { status: "PUBLISHED" },
        include: {
          _count: { select: { enrollments: true } },
          reviews: { select: { rating: true } },
          sections: { include: { _count: { select: { lessons: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!profile) notFound();

  const totalStudents = profile.courses.reduce(
    (sum, c) => sum + c._count.enrollments, 0
  );
  const allRatings = profile.courses.flatMap((c) =>
    c.reviews.map((r) => r.rating)
  );
  const avgRating =
    allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
      : 0;

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="flex-shrink-0">
          {profile.user.avatarUrl ? (
            <img
              src={profile.user.avatarUrl}
              alt={profile.user.name || ""}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-3xl font-bold">
              {(profile.user.name || "?")[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {profile.user.name || "Instructor"}
          </h1>
          {profile.headline && (
            <p className="text-[var(--color-accent)] font-medium mb-3">
              {profile.headline}
            </p>
          )}
          {profile.bio && (
            <p className="text-[var(--color-text-secondary)] leading-relaxed mb-5">
              {profile.bio}
            </p>
          )}
          <div className="flex items-center gap-6 text-sm text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              {profile.courses.length} courses
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {totalStudents} students
            </span>
            {avgRating > 0 && (
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                {avgRating.toFixed(1)} avg rating
              </span>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-6">
        Courses by {profile.user.name}
      </h2>

      {profile.courses.length === 0 ? (
        <p className="text-[var(--color-text-secondary)]">
          No published courses yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {profile.courses.map((course) => {
            const courseAvg =
              course.reviews.length > 0
                ? course.reviews.reduce((s, r) => s + r.rating, 0) /
                  course.reviews.length
                : 0;
            const lessonCount = course.sections.reduce(
              (s, sec) => s + sec._count.lessons,
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
                  <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 mb-3 group-hover:text-[var(--color-accent)]">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                    {courseAvg > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                        {courseAvg.toFixed(1)}
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
    </div>
  );
}
