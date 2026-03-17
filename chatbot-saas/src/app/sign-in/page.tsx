import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LogIn } from "lucide-react";

export default async function SignInPage() {
  if (await isAuthenticated()) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            ChatForge
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            AI-powered chatbots, tailored to your needs
          </p>
        </div>

        <a
          href="/api/auth/login"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <LogIn className="h-4 w-4" />
          Sign in with Whop
        </a>
      </div>
    </div>
  );
}
