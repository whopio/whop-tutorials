import { requireCreator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsForm from "@/components/dashboard/SettingsForm";
import GoalForm from "@/components/dashboard/GoalForm";

export default async function DashboardSettingsPage() {
  const { creator } = await requireCreator();

  const goal = await prisma.goal.findFirst({
    where: { creatorId: creator.id, isActive: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Your page is live at{" "}
          <a
            href={`/${creator.username}`}
            className="font-semibold text-brand"
            target="_blank"
            rel="noreferrer"
          >
            cuppa.com/{creator.username}
          </a>
        </p>
      </div>

      <SettingsForm
        creator={{
          displayName: creator.displayName,
          bio: creator.bio ?? "",
          coverImageUrl: creator.coverImageUrl ?? "",
          avatarUrl: creator.avatarUrl ?? "",
          tags: creator.tags,
          accentColor: creator.accentColor,
        }}
      />

      <GoalForm
        goal={
          goal
            ? { title: goal.title, description: goal.description ?? "", targetCents: goal.targetCents }
            : null
        }
      />
    </div>
  );
}
