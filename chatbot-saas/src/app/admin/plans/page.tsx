import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createPlan, togglePlanActive, deletePlan } from "./actions";
import { Plus, ArrowLeft, Zap, Trash2, Eye, EyeOff } from "lucide-react";

export default async function AdminPlansPage() {
  if (!(await isAdmin())) redirect("/");

  const plans = await prisma.plan.findMany({
    orderBy: { price: "asc" },
    include: {
      _count: { select: { bots: true, memberships: true } },
    },
  });

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
          Plans
        </h1>

        <form
          action={createPlan}
          className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Create a plan
          </h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            This creates a product and checkout link on Whop automatically.
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Plan name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                maxLength={40}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="e.g. Pro"
              />
            </div>

            <div>
              <label
                htmlFor="price"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Monthly price (USD)
              </label>
              <input
                type="number"
                id="price"
                name="price"
                required
                min="1"
                step="0.01"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="9.00"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowCustomBots"
                name="allowCustomBots"
                className="rounded border-zinc-300"
              />
              <label
                htmlFor="allowCustomBots"
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                Allow custom bot creation
              </label>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Plus className="h-4 w-4" />
              Create plan
            </button>
          </div>
        </form>

        {plans.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No plans yet. Create your first one above.
          </p>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl border bg-white px-5 py-4 shadow-sm dark:bg-zinc-900 ${
                  plan.isActive
                    ? "border-zinc-200 dark:border-zinc-800"
                    : "border-zinc-200/50 opacity-60 dark:border-zinc-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {plan.name}
                        <span className="ml-2 text-zinc-500">
                          ${(plan.price / 100).toFixed(2)}/mo
                        </span>
                        {plan.allowCustomBots && (
                          <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            Custom bots
                          </span>
                        )}
                        {!plan.isActive && (
                          <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
                            Inactive
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {plan._count.bots} bots &middot;{" "}
                        {plan._count.memberships} members
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <form action={togglePlanActive}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <button
                        type="submit"
                        title={plan.isActive ? "Deactivate" : "Activate"}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                      >
                        {plan.isActive ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </form>
                    <form action={deletePlan}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <button
                        type="submit"
                        title="Delete"
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
