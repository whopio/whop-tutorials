import { getOptionalUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeaturesBento } from "@/components/landing/features-bento";
import { TemplateShowcase } from "@/components/landing/template-showcase";
import { Pricing } from "@/components/landing/pricing";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default async function LandingPage() {
  const user = await getOptionalUser();
  const isAuthenticated = !!user;

  const templates = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const templateShowcase = templates.map((t: (typeof templates)[number]) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    category: t.category,
    tier: t.tier as "FREE" | "PRO",
  }));

  return (
    <>
      <LandingNav isAuthenticated={isAuthenticated} />
      <main>
        <Hero isAuthenticated={isAuthenticated} />
        <HowItWorks />
        <FeaturesBento />
        <TemplateShowcase templates={templateShowcase} />
        <Pricing isAuthenticated={isAuthenticated} />
        <FinalCta isAuthenticated={isAuthenticated} />
      </main>
      <LandingFooter />
    </>
  );
}
