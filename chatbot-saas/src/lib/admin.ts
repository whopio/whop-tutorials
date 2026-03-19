import { getSession } from "./session";
import { getWhop } from "./whop";

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session.whopUserId) return false;

  try {
    const whop = getWhop();
    const access = await whop.users.checkAccess(
      process.env.WHOP_COMPANY_ID!,
      { id: session.whopUserId }
    );
    return access.access_level === "admin";
  } catch {
    return false;
  }
}
