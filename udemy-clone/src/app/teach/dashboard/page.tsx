import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth, getCreatorProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { Plus, BookOpen, Users, DollarSign } from "lucide-react";
import { DeleteCourseButton } from "@/components/delete-course-button";

export default async function TeachDashboardPage() {
  const user = await requireAuth();
  if (!user) redirect("/sign-in");

  const profile = await getCreatorProfile(user.id);
  if (!profile) redirect("/teach");
  if (!profile.kycComplete) redirect("/teach");

  const courses = await prisma.course.findMany({
    where: { creatorId: profile.id },
    include: {
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalStudents = courses.reduce((sum, c) => sum + c._count.enrollments, 0);
  const totalEarnings = courses.reduce(
    (sum, c) => sum + c.price * c._count.enrollments * ((100 - PLATFORM_FEE_PERCENT) / 100),
    0
  );

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Instructor Dashboard</h1>
        <Link
          href="/teach/courses/new"
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)]"
        >
          <Plus className="w-4 h-4" /> New Course
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {[
          { icon: DollarSign, label: "Total Earnings", value: formatPrice(Math.round(totalEarnings)) },
          { icon: Users, label: "Total Students", value: String(totalStudents) },
          { icon: BookOpen, label: "Courses", value: String(courses.length) },
        ].map((stat) => (
          <div key={stat.label} className="p-7 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center mb-4">
              <stat.icon className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-1">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-5">Your Courses</h2>
      {courses.length === 0 ? (
        <p className="text-[var(--color-text-secondary)]">No courses yet. Create your first one!</p>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="flex items-center justify-between p-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)]">
              <div>
                <h3 className="font-semibold">{course.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-sm text-[var(--color-text-secondary)]">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    course.status === "PUBLISHED"
                      ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                      : "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
                  }`}>
                    {course.status}
                  </span>
                  <span>{course._count.enrollments} students</span>
                  <span>{formatPrice(course.price)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/teach/courses/${course.id}/edit`}
                  className="text-sm px-5 py-2.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] font-medium"
                >
                  Edit
                </Link>
                <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
