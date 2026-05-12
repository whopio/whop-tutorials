"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

export async function createCheckout(
  _prev: { message: string },
  formData: FormData
): Promise<{ message: string }> {
  const songId = formData.get("songId")?.toString();
  const artistId = formData.get("artistId")?.toString();

  if (!songId || !artistId) return { message: "Missing song or artist" };

  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: { artist: true },
  });

  if (!song) return { message: "Song not found" };
  if (song.artistId !== artistId) return { message: "Invalid artist" };
  if (!song.artist.whopCompanyId) return { message: "Artist has not enabled earnings" };

  // Create pending unlock
  const unlock = await prisma.unlock.create({
    data: {
      artistId: song.artistId,
      songId: song.id,
      status: "PENDING",
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL as string;
  const handle = song.artist.handle;
  const redirectUrl = `${appUrl}/a/${handle}?checkout_status=success&payment_id={PAYMENT_ID}&unlocked=${unlock.id}&song=${song.id}`;

  const checkout = await whop.checkoutConfigurations.create({
    plan: {
      company_id: song.artist.whopCompanyId,
      currency: "usd",
      plan_type: "one_time",
      initial_price: song.price / 100,
      application_fee_amount: song.artist.applicationFee / 100,
    },
    redirect_url: redirectUrl,
    metadata: {
      unlock_id: unlock.id,
      song_id: song.id,
      artist_id: song.artistId,
    },
  });

  redirect(checkout.purchase_url);
}
