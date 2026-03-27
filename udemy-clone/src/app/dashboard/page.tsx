import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, PlayCircle, CheckCircle, Trophy } from "lucide-react";
import { UnenrollButton } from "@/components/unenroll-button";

export default async function StudentDashboardPage() {
  const user = await requireAuth();
  if (!user) redirect("/sign-in");

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        include: {
          creator: { include: { user: true } },
          sections: { include: { lessons: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const completedLessonIds = new Set(
    (
      await prisma.progress.findMany({
        where: { userId: user.id, completed: true },
        select: { lessonId: true },
      })
    ).map((p) => p.lessonId)
  );

  const enriched = enrollments.map((e) => {
    const totalLessons = e.course.sections.reduce(
      (sum, s) => sum + s.lessons.length, 0
    );
    const completedCount = e.course.sections.reduce(
      (sum, s) => sum + s.lessons.filter((l) => completedLessonIds.has(l.id)).length, 0
    );
    const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    return { ...e, totalLessons, completedCount, percent };
  });

  const inProgress = enriched.filter((e) => e.percent < 100);
  const completed = enriched.filter((e) => e.percent === 100);
  const totalLessonsCompleted = enriched.reduce((sum, e) => sum + e.completedCount, 0);

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <h1 className="text-3xl font-bold tracking-tight mb-10">My Learning</h1>

      {enriched.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-lg bg-[var(--color-surface)] flex items-center justify-center mx-auto mb-5">
            <BookOpen className="w-8 h-8 text-[var(--color-text-secondary)]" />
          </div>
          <p className="text-[var(--color-text-secondary)] mb-6">You haven&apos;t enrolled in any courses yet.</p>
          <Link href="/courses" className="px-8 py-3.5 rounded-lg bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)]">
            Browse Courses
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="p-7 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center mb-4">
                <BookOpen className="w-5 h-5 text-[var(--color-accent)]" />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Enrolled Courses</p>
              <p className="text-2xl font-bold">{enriched.length}</p>
            </div>
            <div className="p-7 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-5 h-5 text-[var(--color-accent)]" />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Lessons Completed</p>
              <p className="text-2xl font-bold">{totalLessonsCompleted}</p>
            </div>
            <div className="p-7 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-success)]/10 flex items-center justify-center mb-4">
                <Trophy className="w-5 h-5 text-[var(--color-success)]" />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Courses Completed</p>
              <p className="text-2xl font-bold">{completed.length}</p>
            </div>
          </div>

          {inProgress.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold">In Progress</h2>
                {inProgress[0] && (
                  <Link
                    href={`/courses/${inProgress[0].course.slug}/learn`}
                    className="flex items-center gap-2 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                  >
                    <PlayCircle className="w-4 h-4" /> Continue Learning
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {inProgress.map((e) => (
                  <div
                    key={e.id}
                    className="group rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden hover:shadow-lg hover:shadow-black/20 hover:border-[var(--color-surface-elevated)]"
                  >
                    <Link href={`/courses/${e.course.slug}/learn`}>
                      <div className="relative aspect-video bg-[var(--color-surface-elevated)]">
                        {e.course.thumbnailUrl && (
                          <img src={e.course.thumbnailUrl} alt={e.course.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[var(--color-border)]">
                          <div className="h-full bg-[var(--color-success)] rounded-full" style={{ width: `${e.percent}%` }} />
                        </div>
                      </div>
                    </Link>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/courses/${e.course.slug}/learn`} className="flex-1">
                          <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-[var(--color-accent)]">{e.course.title}</h3>
                        </Link>
                        <UnenrollButton enrollmentId={e.id} courseTitle={e.course.title} />
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-2">{e.course.creator.user.name}</p>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {e.completedCount}/{e.totalLessons} lessons
                        </p>
                        <p className="text-xs font-medium text-[var(--color-accent)]">{e.percent}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {completed.length > 0 && (
            <>
              <h2 className="text-xl font-semibold mb-5">Completed</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {completed.map((e) => (
                  <div
                    key={e.id}
                    className="group rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden hover:shadow-lg hover:shadow-black/20 hover:border-[var(--color-surface-elevated)]"
                  >
                    <Link href={`/courses/${e.course.slug}`}>
                      <div className="relative aspect-video bg-[var(--color-surface-elevated)]">
                        {e.course.thumbnailUrl && (
                          <img src={e.course.thumbnailUrl} alt={e.course.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[var(--color-success)] text-white text-xs font-medium">
                          Completed
                        </div>
                      </div>
                    </Link>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/courses/${e.course.slug}`} className="flex-1">
                          <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-[var(--color-accent)]">{e.course.title}</h3>
                        </Link>
                        <UnenrollButton enrollmentId={e.id} courseTitle={e.course.title} />
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-2">{e.course.creator.user.name}</p>
                      <p className="text-xs text-[var(--color-success)] font-medium mt-3">
                        {e.totalLessons} lessons completed
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
