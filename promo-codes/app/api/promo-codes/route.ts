import { getSeededCodes } from "@/lib/promo";

// Read only, on purpose. A promo code cannot be updated and archiving it is
// permanent, so a shared demo that let anyone create codes would fill the
// company with strings nobody can reclaim. The seeded set is provisioned once
// by scripts/setup.mjs and picked from here.
//
// The create call itself still earns its place in the article. It is the same
// promoCodes.create body the setup script sends, shown in the picker panel.
export async function GET() {
  return Response.json({ codes: await getSeededCodes() });
}
