import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import OnboardingWizard from "@/components/OnboardingWizard";
import BrandIcon from "@/components/BrandIcon";

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>;
}) {
  const user = await requireAuth();
  if (user.creator) redirect("/dashboard");

  const { handle } = await searchParams;
  const suggestedUsername = (handle ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "");

  return (
    <main className="min-h-dvh bg-page">
      <div className="mx-auto max-w-lg px-5 py-12">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <BrandIcon name="coffee" className="h-9 w-9" />
          <span className="font-display text-2xl font-extrabold">Cuppa</span>
        </Link>
        <OnboardingWizard
          email={user.email ?? undefined}
          defaultName={user.name ?? undefined}
          defaultUsername={suggestedUsername || undefined}
        />
      </div>
    </main>
  );
}
