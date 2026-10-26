import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth, getWriterProfile } from "@/lib/auth";
import { OnboardingWizard } from "@/components/settings/onboarding-wizard";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata: Metadata = {
  title: "Settings | Penstack",
};

export default async function SettingsPage() {
  const user = await requireAuth();
  if (!user) redirect("/api/auth/login");

  // kycCompleted only changes in the webhook route, when Whop sends
  // verification.succeeded for the writer's connected account
  const writer = await getWriterProfile(user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 font-serif text-3xl font-bold">Settings</h1>

      {writer ? (
        <ProfileForm writer={writer} />
      ) : (
        <OnboardingWizard />
      )}
    </div>
  );
}
