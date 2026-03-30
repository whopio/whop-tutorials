import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { formatDuration } from "@/lib/utils";
import { CheckCircle, Circle, ChevronLeft, ChevronRight } from "lucide-react";
import { VideoPlayer } from "@/components/video-player";
import { MarkCompleteButton } from "@/components/mark-complete-button";
import { ChatToggle } from "@/components/chat-toggle";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      creator: true,
      sections: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!course) notFound();

  const currentLesson = course.sections
    .flatMap((s) => s.lessons)
    .find((l) => l.id === lessonId);
  if (!currentLesson) notFound();

  const user = await requireAuth({ redirect: false });
  let isEnrolled = false;
  let completedLessonIds = new Set<string>();

  if (user) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    isEnrolled = !!enrollment;

    if (isEnrolled) {
      const progress = await prisma.progress.findMany({
        where: { userId: user.id, completed: true, lesson: { section: { courseId: course.id } } },
        select: { lessonId: true },
      });
      completedLessonIds = new Set(progress.map((p) => p.lessonId));
    }
  }

  if (!currentLesson.isFree && !isEnrolled) {
    redirect(`/courses/${slug}`);
  }

  const allLessons = course.sections.flatMap((s) => s.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) => completedLessonIds.has(l.id)).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="h-full flex flex-col lg:flex-row">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-black aspect-video w-full">
          {currentLesson.muxPlaybackId && currentLesson.videoReady ? (
            <VideoPlayer
              playbackId={currentLesson.muxPlaybackId}
              lessonId={currentLesson.id}
              isEnrolled={isEnrolled}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)]">
              Video not available
            </div>
          )}
        </div>

        <div className="p-8">
          <h1 className="text-xl font-semibold mb-5">{currentLesson.title}</h1>
          <div className="flex items-center gap-4">
            {prevLesson ? (
              <Link
                href={`/courses/${slug}/learn/${prevLesson.id}`}
                className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Link>
            ) : (
              <span />
            )}
            {isEnrolled && (
              <MarkCompleteButton
                lessonId={currentLesson.id}
                isCompleted={completedLessonIds.has(currentLesson.id)}
              />
            )}
            {nextLesson ? (
              <Link
                href={`/courses/${slug}/learn/${nextLesson.id}`}
                className="flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] ml-auto"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <span className="ml-auto text-sm text-[var(--color-success)] font-medium">Last lesson</span>
            )}
          </div>
        </div>

        {isEnrolled && course.whopChatChannelId && (
          <ChatToggle
            channelId={course.whopChatChannelId}
          />
        )}
      </div>

      <aside className="w-full lg:w-80 flex-shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto">
        <div className="p-5 border-b border-[var(--color-border)]">
          <Link href={`/courses/${slug}`} className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            &larr; {course.title}
          </Link>
          {isEnrolled && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mb-2">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-success)] rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {course.sections.map((section) => (
          <div key={section.id}>
            <div className="px-5 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide bg-[var(--color-surface-elevated)]">
              {section.title}
            </div>
            {section.lessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/courses/${slug}/learn/${lesson.id}`}
                className={`flex items-center gap-2.5 px-5 py-3 text-sm border-l-2 ${
                  lesson.id === lessonId
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text-primary)]"
                    : "border-transparent hover:bg-[var(--color-surface-elevated)]"
                }`}
              >
                {completedLessonIds.has(lesson.id) ? (
                  <CheckCircle className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{lesson.title}</span>
                {lesson.duration && (
                  <span className="text-xs text-[var(--color-text-secondary)]">{formatDuration(lesson.duration)}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </aside>
    </div>
  );
}
