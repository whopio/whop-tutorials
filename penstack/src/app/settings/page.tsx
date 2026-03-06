import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth, getWriterProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/settings/onboarding-wizard";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata: Metadata = {
  title: "Settings | Penstack",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireAuth();
  if (!user) redirect("/api/auth/login");

  const params = await searchParams;
  const writer = await getWriterProfile(user.id);

  // After KYC setup redirect, mark kycCompleted if the writer has a connected account
  if (
    params.checkout_status === "success" &&
    writer &&
    !writer.kycCompleted &&
    writer.whopCompanyId
  ) {
    await prisma.writer.update({
      where: { id: writer.id },
      data: { kycCompleted: true },
    });
    writer.kycCompleted = true;
  }

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
