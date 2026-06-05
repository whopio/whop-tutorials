import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ProfileRender } from "@/components/ProfileRender";
import { UnlockButton } from "./UnlockButton";
import { unlockCookieName, verifyUnlock } from "@/lib/unlock";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { handle } = await params;

  const creator = await prisma.creator.findUnique({
    where: { handle },
    include: {
      links: { orderBy: { sortOrder: "asc" } },
      socials: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!creator) notFound();

  // Premium access is proved by a signed httpOnly cookie set after a verified
  // payment, then confirmed against the database.
  let hasPaidUnlock = false;
  const cookieStore = await cookies();
  const unlockId = verifyUnlock(
    cookieStore.get(unlockCookieName(creator.id))?.value
  );
  if (unlockId) {
    const unlock = await prisma.unlock.findUnique({ where: { id: unlockId } });
    hasPaidUnlock = unlock?.creatorId === creator.id && unlock?.status === "PAID";
  }

  return (
    <div className="min-h-screen bg-white">
      <ProfileRender
        creator={creator}
        links={creator.links}
        socials={creator.socials}
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
