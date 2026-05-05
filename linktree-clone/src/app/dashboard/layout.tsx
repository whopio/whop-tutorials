import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/");

  return <>{children}</>;
}
