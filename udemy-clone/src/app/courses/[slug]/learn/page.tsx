import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export default async function LearnRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireAuth();
  if (!user) redirect("/sign-in");

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!course) notFound();

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
  });
  if (!enrollment) redirect(`/courses/${slug}`);

  const completedLessonIds = new Set(
    (
      await prisma.progress.findMany({
        where: { userId: user.id, completed: true },
        select: { lessonId: true },
      })
    ).map((p) => p.lessonId)
  );

  const allLessons = course.sections.flatMap((s) => s.lessons);
  const firstIncomplete = allLessons.find((l) => !completedLessonIds.has(l.id));
  const target = firstIncomplete || allLessons[0];

  if (!target) redirect(`/courses/${slug}`);
  redirect(`/courses/${slug}/learn/${target.id}`);
}
