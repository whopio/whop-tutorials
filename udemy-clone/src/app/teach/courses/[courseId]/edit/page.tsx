import { redirect, notFound } from "next/navigation";
import { requireAuth, getCreatorProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseEditor } from "@/components/course-editor";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const user = await requireAuth();
  if (!user) redirect("/sign-in");

  const profile = await getCreatorProfile(user.id);
  if (!profile) redirect("/teach");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!course || course.creatorId !== profile.id) notFound();

  return (
    <main className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Edit: {course.title}</h1>
        {course.status === "PUBLISHED" ? (
          <span className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-[var(--color-success)]/15 text-[var(--color-success)]">Published</span>
        ) : (
          <span className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-[var(--color-warning)]/15 text-[var(--color-warning)]">Draft</span>
        )}
      </div>

      <div className="space-y-8">
        <div className="p-7 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <h2 className="font-semibold mb-5">Course Info</h2>
          <div className="space-y-3 text-sm">
            <div><span className="text-[var(--color-text-secondary)]">Title:</span> {course.title}</div>
            <div><span className="text-[var(--color-text-secondary)]">Category:</span> {course.category}</div>
            <div><span className="text-[var(--color-text-secondary)]">Price:</span> ${(course.price / 100).toFixed(2)}</div>
            <div><span className="text-[var(--color-text-secondary)]">Description:</span> <span className="line-clamp-2">{course.description}</span></div>
          </div>
        </div>

        <CourseEditor
          courseId={course.id}
          sections={course.sections.map((s) => ({
            id: s.id,
            title: s.title,
            order: s.order,
            lessons: s.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              order: l.order,
              isFree: l.isFree,
              videoReady: l.videoReady,
              muxUploadId: l.muxUploadId,
            })),
          }))}
          status={course.status}
        />
      </div>
    </main>
  );
}
