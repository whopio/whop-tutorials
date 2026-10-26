import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export async function requirePro() {
  const user = await requireUser();
  if (user.plan !== "pro") redirect("/?upgrade=1");
  return user;
}
