import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createBot, deleteBot, updateBotPrompt } from "./actions";
import { SUPPORTED_MODELS } from "@/lib/ai";
import { Trash2, Plus, Bot as BotIcon, ArrowLeft } from "lucide-react";

export default async function AdminBotsPage() {
  if (!(await isAdmin())) redirect("/");

  const [bots, plans] = await Promise.all([
    prisma.bot.findMany({
      where: { type: { in: ["SYSTEM", "MODEL"] } },
      orderBy: { createdAt: "asc" },
      include: { plan: { select: { name: true, price: true } } },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl">
        <a
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </a>

        <h1 className="mb-8 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Bot Catalog
        </h1>

        <form
          action={createBot}
          className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Create a bot
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="e.g. Code Tutor"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Description
              </label>
              <input
                type="text"
                id="description"
                name="description"
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="A one-sentence summary of what this bot does"
              />
            </div>

            <div>
              <label
                htmlFor="systemPrompt"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                System prompt
              </label>
              <textarea
                id="systemPrompt"
                name="systemPrompt"
                required
                rows={6}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="Define the bot's role, constraints, tone, and format preferences..."
              />
            </div>

            <div>
              <label
                htmlFor="knowledge"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Knowledge{" "}
                <span className="font-normal text-zinc-400">(optional)</span>
              </label>
              <textarea
                id="knowledge"
                name="knowledge"
                rows={3}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="Plain text that the bot can reference during conversations..."
              />
            </div>

            <div>
              <label
                htmlFor="model"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Model
              </label>
              <select
                id="model"
                name="model"
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {SUPPORTED_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="planId"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Required plan{" "}
                <span className="font-normal text-zinc-400">
                  (leave empty for free access)
                </span>
              </label>
              <select
                id="planId"
                name="planId"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">Free (no plan required)</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — ${(plan.price / 100).toFixed(2)}/mo
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Plus className="h-4 w-4" />
              Create bot
            </button>
          </div>
        </form>

        {bots.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No bots yet. Create your first one above.
          </p>
        ) : (
          <div className="space-y-3">
            {bots.map((bot) => {
              const modelLabel = SUPPORTED_MODELS.find(
                (m) => m.id === bot.model
              )?.label;
              return (
                <div
                  key={bot.id}
                  className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BotIcon className="h-5 w-5 text-zinc-400" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {bot.name}
                          {bot.type === "MODEL" ? (
                            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              Raw Model
                            </span>
                          ) : bot.plan ? (
                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              {bot.plan.name} ($
                              {(bot.plan.price / 100).toFixed(2)})
                            </span>
                          ) : (
                            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Free
                            </span>
                          )}
                          {modelLabel && (
                            <span className="ml-2 text-xs text-zinc-400">
                              {modelLabel}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {bot.description}
                        </p>
                      </div>
                    </div>

                    {bot.type !== "MODEL" && (
                      <form action={deleteBot}>
                        <input type="hidden" name="botId" value={bot.id} />
                        <button
                          type="submit"
                          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    )}
                  </div>

                  {bot.type === "MODEL" && (
                    <form action={updateBotPrompt} className="mt-3">
                      <input type="hidden" name="botId" value={bot.id} />
                      <textarea
                        name="systemPrompt"
                        rows={2}
                        defaultValue={bot.systemPrompt}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        placeholder="Default system prompt for this model (optional)..."
                      />
                      <button
                        type="submit"
                        className="mt-1 rounded-md bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      >
                        Update prompt
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
