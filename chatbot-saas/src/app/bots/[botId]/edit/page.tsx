import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlan, MAX_KNOWLEDGE_LENGTH } from "@/lib/membership";
import { updateUserBot } from "../../actions";
import { SUPPORTED_MODELS } from "@/lib/ai";
import { ArrowLeft } from "lucide-react";

export default async function EditBotPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const user = await requireAuth();
  if (!user) return null;

  const userPlan = await getUserPlan(user.id);
  if (!userPlan?.allowCustomBots) redirect("/chat");

  const { botId } = await params;

  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot || bot.type !== "USER" || bot.createdById !== user.id) {
    redirect("/bots");
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <a
          href="/bots"
          className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </a>

        <h1 className="mb-8 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Edit Bot
        </h1>

        <form
          action={updateUserBot}
          className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <input type="hidden" name="botId" value={bot.id} />

          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Name <span className="font-normal text-zinc-400">(max 50)</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              maxLength={50}
              defaultValue={bot.name}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Description{" "}
              <span className="font-normal text-zinc-400">(max 200)</span>
            </label>
            <input
              type="text"
              id="description"
              name="description"
              required
              maxLength={200}
              defaultValue={bot.description}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="systemPrompt"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              System prompt{" "}
              <span className="font-normal text-zinc-400">(max 5,000)</span>
            </label>
            <textarea
              id="systemPrompt"
              name="systemPrompt"
              required
              rows={6}
              maxLength={5000}
              defaultValue={bot.systemPrompt}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
              defaultValue={bot.model || "claude-haiku-4-5-20251001"}
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
              htmlFor="knowledge"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Knowledge{" "}
              <span className="font-normal text-zinc-400">
                (optional, max {MAX_KNOWLEDGE_LENGTH.toLocaleString()} chars)
              </span>
            </label>
            <textarea
              id="knowledge"
              name="knowledge"
              rows={4}
              maxLength={MAX_KNOWLEDGE_LENGTH}
              defaultValue={bot.knowledge ?? ""}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Save changes
          </button>
        </form>
      </div>
    </div>
  );
}
