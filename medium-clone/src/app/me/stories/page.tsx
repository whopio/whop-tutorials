import Link from "next/link";
import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteStoryButton } from "@/components/DeleteStoryButton";

export const metadata: Metadata = { title: "My stories" };

interface PageProps {
  searchParams: Promise<{ published?: string }>;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function MyStoriesPage({ searchParams }: PageProps) {
  const user = await requireAuth();
  const { published } = await searchParams;

  const stories = await prisma.story.findMany({
    where: { authorUserId: user.id },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      visibility: true,
      likesTotal: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  const drafts = stories.filter((s) => s.status === "DRAFT");
  const published_ = stories.filter((s) => s.status === "PUBLISHED");

  return (
    <div className="mx-auto max-w-[760px] px-4 sm:px-6 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-3 mb-8">
        <h1 className="font-sans font-bold text-[28px] sm:text-[32px] text-text-primary">
          Your stories
        </h1>
        <Link
          href="/new-story"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-medium hover:bg-brand-hover"
        >
          <Pencil aria-hidden="true" className="size-4" /> Write
        </Link>
      </header>

      {published === "1" && (
        <div
          role="status"
          className="mb-6 px-4 py-3 rounded-md bg-brand/10 text-brand text-sm border border-brand/30"
        >
          Story published.
        </div>
      )}

      <Section title={`Drafts (${drafts.length})`}>
        {drafts.length === 0 ? (
          <Empty>No drafts.</Empty>
        ) : (
          drafts.map((s) => (
            <Row key={s.id}>
              <div className="flex-1 min-w-0">
                <Link href={`/edit/${s.id}`} className="font-medium text-text-primary hover:underline">
                  {s.title || "Untitled draft"}
                </Link>
                <div className="text-xs text-text-tertiary mt-1">
                  Last edited {formatDate(s.updatedAt)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/edit/${s.id}`}
                  className="text-sm text-text-secondary hover:text-text-primary"
                >
                  Edit
                </Link>
                <DeleteStoryButton storyId={s.id} />
              </div>
            </Row>
          ))
        )}
      </Section>

      <Section title={`Published (${published_.length})`}>
        {published_.length === 0 ? (
          <Empty>You haven&apos;t published a story yet.</Empty>
        ) : (
          published_.map((s) => (
            <Row key={s.id}>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/@${user.username}/${s.slug}`}
                  className="font-medium text-text-primary hover:underline"
                >
                  {s.title}
                </Link>
                <div className="text-xs text-text-tertiary mt-1">
                  Published {formatDate(s.publishedAt)} · {s.likesTotal} likes
                  {s.visibility === "PLUS" && <span> · Plus</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/edit/${s.id}`}
                  className="text-sm text-text-secondary hover:text-text-primary"
                >
                  Edit
                </Link>
              </div>
            </Row>
          ))
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-2">
        {title}
      </h2>
      <div className="border-t border-border">{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-4 border-b border-border last:border-0">
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-6 text-text-secondary text-sm">{children}</div>;
}
