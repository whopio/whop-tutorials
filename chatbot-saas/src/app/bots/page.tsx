import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlan, USER_BOT_LIMIT } from "@/lib/membership";
import { deleteUserBot } from "./actions";
import { ArrowLeft, Plus, Bot as BotIcon, Pencil, Trash2 } from "lucide-react";

export default async function UserBotsPage() {
  const user = await requireAuth();
  if (!user) return null;

  const userPlan = await getUserPlan(user.id);
  if (!userPlan?.allowCustomBots) redirect("/chat");

  const bots = await prisma.bot.findMany({
    where: { type: "USER", createdById: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl">
        <a
          href="/chat"
          className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to chat
        </a>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              My Bots
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {bots.length} / {USER_BOT_LIMIT} bots
            </p>
          </div>
          {bots.length < USER_BOT_LIMIT && (
            <a
              href="/bots/new"
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Plus className="h-4 w-4" />
              Create bot
            </a>
          )}
        </div>

        {bots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
            <BotIcon className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No custom bots yet. Create your first one!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-3">
                  <BotIcon className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {bot.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {bot.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <a
                    href={`/bots/${bot.id}/edit`}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </a>
                  <form action={deleteUserBot}>
                    <input type="hidden" name="botId" value={bot.id} />
                    <button
                      type="submit"
                      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
