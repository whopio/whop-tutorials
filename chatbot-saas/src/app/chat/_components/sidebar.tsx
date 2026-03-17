"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  Plus,
  MessageSquare,
  Settings,
  LogOut,
  Zap,
  Bot,
  CreditCard,
  Sparkles,
  X,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  LogIn,
} from "lucide-react";
import { createCheckoutUrl } from "@/app/checkout-action";
import { deleteConversation, renameConversation } from "@/app/chat/actions";
import { SignInModal } from "./sign-in-modal";

type ConversationItem = {
  id: string;
  title: string | null;
  bot: { name: string };
  updatedAt: string;
};

type PlanItem = {
  name: string;
  price: number;
  checkoutUrl: string;
  allowCustomBots: boolean;
  whopPlanId: string;
};

type SidebarProps = {
  conversations: ConversationItem[];
  user: { name: string | null; avatarUrl: string | null } | null;
  userPlan: { name: string; price: number; allowCustomBots?: boolean } | null;
  isAdmin: boolean;
  plans: PlanItem[];
  isAuthenticated: boolean;
};

export function Sidebar({
  conversations,
  user,
  userPlan,
  isAdmin,
  plans,
  isAuthenticated,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [settingsOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    if (menuOpenId) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenId]);

  useEffect(() => {
    if (!confirmingDeleteId) return;
    const timer = setTimeout(() => setConfirmingDeleteId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmingDeleteId]);

  async function handleUpgrade(plan: PlanItem) {
    setUpgrading(true);
    const url = await createCheckoutUrl(plan.whopPlanId);
    window.location.href = url;
  }

  async function handleRename(conversationId: string) {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    await renameConversation(conversationId, editTitle);
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(conversationId: string) {
    await deleteConversation(conversationId);
  }

  return (
    <>
      <aside className="flex h-full w-72 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="p-4">
          {isAuthenticated ? (
            <a
              href="/chat"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              New chat
            </a>
          ) : (
            <button
              onClick={() => setSignInOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              New chat
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {!isAuthenticated ? (
            <p className="px-3 py-8 text-center text-xs text-zinc-400">
              Sign in to see previous chats
            </p>
          ) : conversations.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-zinc-400">
              No conversations yet
            </p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((conv) => {
                const isActive = pathname === `/chat/${conv.id}`;
                return (
                  <li key={conv.id} className="group relative">
                    {editingId === conv.id ? (
                      <div className="flex items-center gap-1 rounded-lg px-3 py-2">
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(conv.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={() => handleRename(conv.id)}
                          className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                    ) : (
                      <a
                        href={`/chat/${conv.id}`}
                        className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                            : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                        }`}
                      >
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {conv.title || "New chat"}
                          </p>
                          <p className="truncate text-xs text-zinc-400">
                            {conv.bot.name}
                          </p>
                        </div>
                      </a>
                    )}

                    {editingId !== conv.id && (
                      <div className="absolute right-2 top-2" ref={menuOpenId === conv.id ? contextMenuRef : undefined}>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                          }}
                          className="rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-200 hover:text-zinc-600 group-hover:opacity-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {menuOpenId === conv.id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setEditTitle(conv.title || "");
                                setEditingId(conv.id);
                                setMenuOpenId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                if (confirmingDeleteId === conv.id) {
                                  handleDelete(conv.id);
                                } else {
                                  setConfirmingDeleteId(conv.id);
                                }
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                confirmingDeleteId === conv.id
                                  ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                              }`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {confirmingDeleteId === conv.id ? "Are you sure?" : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <div
          className="relative border-t border-zinc-200 p-3 dark:border-zinc-800"
          ref={menuRef}
        >
          {isAuthenticated ? (
            <>
              {settingsOpen && (
                <div className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-700">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {userPlan ? userPlan.name : "Free"} plan
                    </p>
                  </div>

                  <div className="p-1">
                    {!userPlan && plans.length > 0 && (
                      <button
                        onClick={() => {
                          setPlansOpen(true);
                          setSettingsOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-amber-700 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                      >
                        <Zap className="h-4 w-4" />
                        Upgrade plan
                      </button>
                    )}

                    {userPlan?.allowCustomBots && (
                      <a
                        href="/bots"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        <Sparkles className="h-4 w-4" />
                        My Bots
                      </a>
                    )}

                    {isAdmin && (
                      <>
                        <a
                          href="/admin/bots"
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          <Bot className="h-4 w-4" />
                          Manage bots
                        </a>
                        <a
                          href="/admin/plans"
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          <CreditCard className="h-4 w-4" />
                          Manage plans
                        </a>
                      </>
                    )}

                    <form action="/api/auth/logout" method="post">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              )}

              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name ?? "Avatar"}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <Settings className="h-4 w-4" />
                )}
                <div className="min-w-0 text-left">
                  <span className="block truncate">
                    {user?.name ?? "Settings"}
                  </span>
                  <span className="block truncate text-xs text-zinc-400">
                    {userPlan ? userPlan.name : "Free membership"}
                  </span>
                </div>
              </button>
            </>
          ) : (
            <a
              href="/api/auth/login"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </a>
          )}
        </div>
      </aside>

      {/* Plans modal */}
      {plansOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPlansOpen(false)}
          />
          <div className="relative mx-4 w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <button
              onClick={() => setPlansOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Choose a plan
            </h2>
            <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
              Unlock premium bots, more messages, and more.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Free tier card */}
              <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Free
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  $0
                  <span className="text-sm font-normal text-zinc-400">
                    /mo
                  </span>
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    Free bots only
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    20 messages per day
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    10 conversations
                  </li>
                </ul>
                <div className="mt-5 rounded-lg border border-zinc-200 px-4 py-2 text-center text-sm font-medium text-zinc-400 dark:border-zinc-700">
                  Current plan
                </div>
              </div>

              {/* Paid plan cards */}
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-5 dark:border-amber-700 dark:bg-amber-950/20"
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {plan.name}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    ${(plan.price / 100).toFixed(0)}
                    <span className="text-sm font-normal text-zinc-400">
                      /mo
                    </span>
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      All bots up to ${(plan.price / 100).toFixed(0)}/mo tier
                    </li>
                    <li className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      50 messages per day
                    </li>
                    <li className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      Unlimited conversations
                    </li>
                    {plan.allowCustomBots && (
                      <li className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        Create custom bots
                      </li>
                    )}
                  </ul>
                  {isAuthenticated ? (
                    <button
                      onClick={() => handleUpgrade(plan)}
                      disabled={upgrading}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
                    >
                      <Zap className="h-4 w-4" />
                      {upgrading ? "Redirecting..." : `Upgrade to ${plan.name}`}
                    </button>
                  ) : (
                    <a
                      href="/api/auth/login"
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign in to upgrade
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sign in modal */}
      <SignInModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} />
    </>
  );
}
