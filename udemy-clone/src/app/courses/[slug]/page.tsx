import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { formatPrice, formatDuration } from "@/lib/utils";
import { Star, Clock, Play, Lock, Users, BookOpen } from "lucide-react";
import { ReviewForm } from "@/components/review-form";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course) return { title: "Course Not Found" };
  return {
    title: `${course.title} | Courstar`,
    description: course.description.slice(0, 160),
    openGraph: {
      title: course.title,
      description: course.description.slice(0, 160),
      images: course.thumbnailUrl ? [course.thumbnailUrl] : [],
    },
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      creator: { include: { user: true } },
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
        },
      },
      reviews: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course || course.status !== "PUBLISHED") notFound();

  const user = await requireAuth({ redirect: false });
  let isEnrolled = false;
  const isCreator = user?.id === course.creator.userId;
  if (user) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    isEnrolled = !!enrollment;
  }

  // Fetch existing review by this user (if enrolled)
  const existingReview = user && isEnrolled
    ? await prisma.review.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      })
    : null;

  const avgRating =
    course.reviews.length > 0
      ? course.reviews.reduce((sum, r) => sum + r.rating, 0) / course.reviews.length
      : 0;

  const totalLessons = course.sections.reduce(
    (sum, s) => sum + s.lessons.length, 0
  );
  const totalDuration = course.sections.reduce(
    (sum, s) => sum + s.lessons.reduce((ls, l) => ls + (l.duration || 0), 0), 0
  );

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div>
            <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]">
              {course.category.charAt(0) + course.category.slice(1).toLowerCase()}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-4 mb-5">{course.title}</h1>
            <div className="flex items-center gap-5 text-sm text-[var(--color-text-secondary)]">
              <Link href={`/instructors/${course.creator.id}`} className="hover:text-[var(--color-accent)]">{course.creator.user.name || "Instructor"}</Link>
              {avgRating > 0 && (
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                  {avgRating.toFixed(1)} ({course.reviews.length} reviews)
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {course._count.enrollments} students
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">About this course</h2>
            <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{course.description}</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-5">Curriculum</h2>
            <div className="space-y-4">
              {course.sections.map((section) => (
                <div key={section.id} className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
                  <div className="px-5 py-4 font-semibold flex justify-between items-center">
                    <span>{section.title}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">{section.lessons.length} lessons</span>
                  </div>
                  <div className="border-t border-[var(--color-border)]">
                    {section.lessons.map((lesson) => (
                      <div key={lesson.id} className="px-5 py-3 flex items-center justify-between text-sm border-b border-[var(--color-border)] last:border-0">
                        <span className="flex items-center gap-2.5">
                          {isEnrolled || lesson.isFree ? (
                            <Play className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                          )}
                          <span className={!isEnrolled && !lesson.isFree ? "text-[var(--color-text-secondary)]" : ""}>
                            {lesson.title}
                          </span>
                          {lesson.isFree && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-success)]/15 text-[var(--color-success)]">Preview</span>
                          )}
                        </span>
                        {lesson.duration && (
                          <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {formatDuration(lesson.duration)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {course.reviews.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-5">Reviews</h2>
              <div className="space-y-4">
                {course.reviews.map((review) => (
                  <div key={review.id} className="p-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-medium text-sm">{review.user.name || "Student"}</span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? "fill-[var(--color-warning)] text-[var(--color-warning)]" : "text-[var(--color-border)]"}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isEnrolled && !isCreator && (
            <ReviewForm
              courseId={course.id}
              existingReview={existingReview ? { rating: existingReview.rating, comment: existingReview.comment } : null}
            />
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="sticky top-8 p-7 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-5">
            {course.thumbnailUrl && (
              <img src={course.thumbnailUrl} alt={course.title} className="w-full aspect-video rounded-lg object-cover" />
            )}
            <div className="text-3xl font-bold">{formatPrice(course.price)}</div>
            {isEnrolled ? (
              <Link
                href={`/courses/${course.slug}/learn`}
                className="block w-full text-center py-3.5 rounded-lg bg-[var(--color-success)] text-white font-semibold hover:opacity-90"
              >
                Start Learning
              </Link>
            ) : user ? (
              course.price > 0 && course.whopCheckoutUrl ? (
                <a
                  href={course.whopCheckoutUrl}
                  className="block w-full text-center py-3.5 rounded-lg bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)]"
                >
                  Enroll Now
                </a>
              ) : (
                <form action={`/api/courses/${course.id}/enroll`} method="POST">
                  <button type="submit" className="w-full py-3.5 rounded-lg bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)]">
                    Enroll for Free
                  </button>
                </form>
              )
            ) : (
              <Link
                href="/sign-in"
                className="block w-full text-center py-3.5 rounded-lg bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)]"
              >
                Sign in to Enroll
              </Link>
            )}
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)] pt-2">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4" /> {totalLessons} lessons
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4" /> {totalDuration > 0 ? formatDuration(totalDuration) : "\u2014"} total
              </div>
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" /> {course._count.enrollments} students
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
