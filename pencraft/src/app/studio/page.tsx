import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserTier, getCheckoutUrl, checkGenerationLimit } from "@/lib/tier";
import { AppShell } from "@/components/app-shell";
import { Header } from "@/components/header";
import { HistorySidebar } from "@/components/history-sidebar";
import { TemplateSidebar } from "@/components/template-sidebar";
import { CenterPanel } from "@/components/center-panel";
import { UpgradeModal } from "@/components/upgrade-modal";
import { LimitModal } from "@/components/limit-modal";

export default async function StudioPage() {
  const user = await requireAuth();

  const tier = await getUserTier(user.id);
  const checkoutUrl = tier === "FREE" ? await getCheckoutUrl() : null;
  const limitCheck = await checkGenerationLimit(user.id);
  const remaining = limitCheck.remaining;

  const gens = await prisma.generation.findMany({
    where: { userId: user.id },
    include: {
      template: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const generations = gens.map((g: (typeof gens)[number]) => ({
    id: g.id,
    title: g.title,
    templateName: g.template.name,
    createdAt: g.createdAt.toISOString(),
  }));

  const generationDetails = new Map<string, {
    id: string;
    title: string;
    output: string;
    templateName: string;
    messages: { id: string; role: "USER" | "ASSISTANT"; content: string }[];
  }>();

  for (const g of gens) {
    generationDetails.set(g.id, {
      id: g.id,
      title: g.title,
      output: g.output,
      templateName: g.template.name,
      messages: g.messages.map((m: (typeof g.messages)[number]) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
    });
  }

  const templates = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const templateData = templates.map((t: (typeof templates)[number]) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    category: t.category,
    tier: t.tier as "FREE" | "PRO",
    inputFields: t.inputFields as unknown as { name: string; label: string; placeholder: string; type: "text" | "textarea" }[],
  }));

  return (
    <AppShell
      header={<Header user={{ name: user.name, email: user.email }} tier={tier} />}
      leftSidebar={<HistorySidebar generations={generations} />}
      centerPanel={<CenterPanel generations={generationDetails} />}
      rightSidebar={<TemplateSidebar templates={templateData} userTier={tier} />}
      upgradeModal={<UpgradeModal checkoutUrl={checkoutUrl} />}
      limitModal={<LimitModal />}
      initialRemaining={remaining}
    />
  );
}
