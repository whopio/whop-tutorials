import { redirect } from "next/navigation";
import { requireAuth, getCreatorProfile } from "@/lib/auth";
import { CreateCourseForm } from "@/components/create-course-form";

export default async function NewCoursePage() {
  const user = await requireAuth();
  if (!user) redirect("/sign-in");

  const profile = await getCreatorProfile(user.id);
  if (!profile?.kycComplete) redirect("/teach");

  return (
    <main className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="text-3xl font-bold tracking-tight mb-10">Create New Course</h1>
      <CreateCourseForm />
    </main>
  );
}
