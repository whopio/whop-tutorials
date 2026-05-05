import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileRender } from "@/components/ProfileRender";
import { UnlockButton } from "./UnlockButton";

interface Props {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ unlocked?: string }>;
}

export default async function PublicProfilePage({ params, searchParams }: Props) {
  const { handle } = await params;
  const { unlocked } = await searchParams;

  const creator = await prisma.creator.findUnique({
    where: { handle },
    include: { links: { orderBy: { sortOrder: "asc" } } },
  });

  if (!creator) notFound();

  let hasPaidUnlock = false;
  if (unlocked) {
    const unlock = await prisma.unlock.findUnique({ where: { id: unlocked } });
    hasPaidUnlock = unlock?.creatorId === creator.id && unlock?.status === "PAID";
  }

  return (
    <div className="min-h-screen bg-white">
      <ProfileRender
        creator={creator}
        links={creator.links}
        hasPaidUnlock={hasPaidUnlock}
        hasEarnings={!!creator.whopCompanyId}
        unlockSlot={
          <UnlockButton
            creatorId={creator.id}
            priceInCents={creator.unlockPrice}
          />
        }
        scale="full"
      />

      <footer className="text-center text-xs text-neutral-300 py-6">
        <a href="/" className="hover:text-neutral-500 transition-colors">
          Built with Linkstacks
        </a>
      </footer>
    </div>
  );
}
