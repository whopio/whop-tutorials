import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth, getWriterProfile } from "@/lib/auth";
import { getWriterStats } from "@/services/writer-service";
import { getPostsByWriter } from "@/services/post-service";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { PostsTable } from "@/components/dashboard/posts-table";
import { KycBanner } from "@/components/settings/kyc-banner";

export const metadata: Metadata = { title: "Dashboard | Penstack" };

export default async function DashboardPage() {
  const user = await requireAuth();
  if (!user) redirect("/api/auth/login");

  const writer = await getWriterProfile(user.id);
  if (!writer) redirect("/settings");

  const [stats, { items: posts }] = await Promise.all([
    getWriterStats(writer.id),
    getPostsByWriter(writer.id, { limit: 50 }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-8 font-serif text-3xl font-bold">Dashboard</h1>
      {!writer.kycCompleted && <div className="mb-6"><KycBanner writerId={writer.id} /></div>}
      <StatsCards stats={stats} />
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold">Your posts</h2>
          <a href="/write" className="btn-primary">
            New post
          </a>
        </div>
        <PostsTable posts={posts} writerHandle={writer.handle} />
      </section>
    </div>
  );
}
