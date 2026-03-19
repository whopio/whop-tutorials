import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlan, USER_BOT_LIMIT, MAX_KNOWLEDGE_LENGTH } from "@/lib/membership";
import { createUserBot } from "../actions";
import { SUPPORTED_MODELS } from "@/lib/ai";
import { ArrowLeft } from "lucide-react";

export default async function NewBotPage() {
  const user = await requireAuth();
  if (!user) return null;

  const userPlan = await getUserPlan(user.id);
  if (!userPlan?.allowCustomBots) redirect("/chat");

  const count = await prisma.bot.count({
    where: { type: "USER", createdById: user.id },
  });

  if (count >= USER_BOT_LIMIT) {
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
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/50">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              You&apos;ve reached the limit of {USER_BOT_LIMIT} custom bots.
              Delete an existing bot to create a new one.
            </p>
          </div>
        </div>
      </div>
    );
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
          Create a Bot
        </h1>

        <form
          action={createUserBot}
          className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
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
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="e.g. My Study Buddy"
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
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="A one-sentence summary of what this bot does"
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
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Define the bot's role, tone, and how it should respond..."
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
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Paste reference text the bot can draw from — notes, docs, FAQs..."
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Create bot
          </button>
        </form>
      </div>
    </div>
  );
}
