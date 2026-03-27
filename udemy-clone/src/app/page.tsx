import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import {
  BookOpen, DollarSign, Users, GraduationCap, Star, ArrowRight,
  Code, Briefcase, Palette, Megaphone, Camera, Music, Heart, Sparkles,
} from "lucide-react";

const CATEGORY_META: Record<string, { icon: typeof Code; label: string }> = {
  DEVELOPMENT: { icon: Code, label: "Development" },
  BUSINESS: { icon: Briefcase, label: "Business" },
  DESIGN: { icon: Palette, label: "Design" },
  MARKETING: { icon: Megaphone, label: "Marketing" },
  PHOTOGRAPHY: { icon: Camera, label: "Photography" },
  MUSIC: { icon: Music, label: "Music" },
  HEALTH: { icon: Heart, label: "Health" },
  LIFESTYLE: { icon: Sparkles, label: "Lifestyle" },
};

export default async function HomePage() {
  const [popularCourses, courseCount, studentCount, instructorCount] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      include: {
        creator: { include: { user: true } },
        _count: { select: { enrollments: true } },
        reviews: { select: { rating: true } },
        sections: { include: { _count: { select: { lessons: true } } } },
      },
      orderBy: { enrollments: { _count: "desc" } },
      take: 6,
    }),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.user.count(),
    prisma.creatorProfile.count({ where: { kycComplete: true } }),
  ]);

  // Get categories with course counts
  const categoryCounts = await prisma.course.groupBy({
    by: ["category"],
    where: { status: "PUBLISHED" },
    _count: true,
  });

  return (
    <div className="min-h-full bg-[var(--color-background)]">
      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-8 py-24 md:py-32 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.08] mb-8">
            Learn from the best
            <br />
            <span className="text-[var(--color-accent)]">creators on the internet</span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-12 leading-relaxed">
            A marketplace where expert instructors share video courses and students pay to learn. The platform handles everything.
          </p>
          <div className="flex items-center justify-center gap-5 mb-16">
            <Link
              href="/courses"
              className="px-8 py-3.5 rounded-lg bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)]"
            >
              Browse Courses
            </Link>
            <Link
              href="/teach"
              className="px-8 py-3.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] font-semibold hover:bg-[var(--color-surface)]"
            >
              Start Teaching
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-8 md:gap-12 text-sm text-[var(--color-text-secondary)]">
            <div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{courseCount}+</p>
              <p>Courses</p>
            </div>
            <div className="w-px h-8 bg-[var(--color-border)]" />
            <div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{studentCount}+</p>
              <p>Students</p>
            </div>
            <div className="w-px h-8 bg-[var(--color-border)]" />
            <div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{instructorCount}+</p>
              <p>Instructors</p>
            </div>
          </div>
        </section>

        {/* Popular courses */}
        {popularCourses.length > 0 && (
          <section className="max-w-6xl mx-auto px-8 py-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Popular Courses</h2>
              <Link
                href="/courses"
                className="flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {popularCourses.map((course) => {
                const avgRating = course.reviews.length > 0
                  ? course.reviews.reduce((s, r) => s + r.rating, 0) / course.reviews.length
                  : 0;
                const lessonCount = course.sections.reduce((s, sec) => s + sec._count.lessons, 0);

                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="group rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden hover:shadow-lg hover:shadow-black/20 hover:border-[var(--color-surface-elevated)]"
                  >
                    <div className="relative aspect-video bg-[var(--color-surface-elevated)]">
                      {course.thumbnailUrl && (
                        <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                      )}
                      <span className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/70 text-white backdrop-blur-sm">
                        {formatPrice(course.price)}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 mb-2 group-hover:text-[var(--color-accent)]">
                        {course.title}
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                        {course.creator.user.name || "Instructor"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                        {avgRating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                            {avgRating.toFixed(1)}
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
          </section>
        )}

        {/* Categories */}
        {categoryCounts.length > 0 && (
          <section className="max-w-6xl mx-auto px-8 py-16">
            <h2 className="text-2xl font-bold tracking-tight mb-8">Browse by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categoryCounts.map(({ category, _count }) => {
                const meta = CATEGORY_META[category] || { icon: BookOpen, label: category };
                const Icon = meta.icon;
                return (
                  <Link
                    key={category}
                    href={`/courses?category=${category}`}
                    className="group p-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] hover:border-[var(--color-accent)]/30"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center mb-3 group-hover:bg-[var(--color-accent)]/20">
                      <Icon className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <p className="font-medium text-sm">{meta.label}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">{_count} courses</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Features */}
        <section className="max-w-6xl mx-auto px-8 py-16">
          <h2 className="text-2xl font-bold tracking-tight mb-8">Why Courstar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: BookOpen, title: "Expert Courses", desc: "Structured video lessons from industry professionals" },
              { icon: DollarSign, title: "Fair Revenue", desc: "Instructors keep 80% of every sale" },
              { icon: Users, title: "Growing Community", desc: "Join thousands of students and instructors" },
              { icon: GraduationCap, title: "Track Progress", desc: "Pick up where you left off, every time" },
            ].map((item) => (
              <div key={item.title} className="p-7 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)]">
                <div className="w-12 h-12 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center mb-5">
                  <item.icon className="w-6 h-6 text-[var(--color-accent)]" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Instructor CTA */}
        <section className="max-w-6xl mx-auto px-8 py-16">
          <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-10 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Share your expertise with the world
            </h2>
            <p className="text-[var(--color-text-secondary)] max-w-xl mx-auto mb-8 leading-relaxed">
              Create video courses, set your own price, and earn money from every student enrollment. We handle payments, hosting, and payouts — you focus on teaching.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-[var(--color-text-secondary)] mb-8">
              <span>80% revenue share</span>
              <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
              <span>No upfront costs</span>
            </div>
            <Link
              href="/teach"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)]"
            >
              Become an Instructor <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] mt-8">
        <div className="max-w-6xl mx-auto px-8 py-10 text-center text-sm text-[var(--color-text-secondary)]">
          &copy; {new Date().getFullYear()} Courstar. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
