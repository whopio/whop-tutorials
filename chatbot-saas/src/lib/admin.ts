import { getSession } from "./session";
import { getWhop } from "./whop";

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session.whopUserId) return false;

  try {
    const whop = getWhop();
    const access = await whop.users.checkAccess({
      id: session.whopUserId,
      resource_id: process.env.WHOP_COMPANY_ID!,
    });
    return access.access_level === "admin";
  } catch {
    return false;
  }
}
