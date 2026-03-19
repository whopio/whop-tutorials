"use client";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Lock, Bot as BotIcon, User, ChevronDown, Plus, AlertCircle, Menu, Clock, Mic, MicOff } from "lucide-react";
import Markdown from "react-markdown";
import { useSidebarToggle } from "./chat-shell";
import { SignInModal } from "./sign-in-modal";

type BotPlan = {
  price: number;
  name: string;
  checkoutUrl: string;
};

type Bot = {
  id: string;
  name: string;
  description: string;
  type: string;
  createdById: string | null;
  planId: string | null;
  model: string | null;
  plan: BotPlan | null;
};

type UserPlan = {
  price: number;
  name: string;
} | null;

type DBMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
};

function dbToUIMessages(msgs: DBMessage[]) {
  return msgs.map((m) => ({
    id: m.id,
    role: m.role.toLowerCase() as "user" | "assistant",
    parts: [{ type: "text" as const, text: m.content }],
  }));
}

function canAccessBot(bot: Bot, userPlan: UserPlan, userId: string | null): boolean {
  if (bot.type === "MODEL") return !!userPlan;
  if (bot.type === "USER") {
    return !!userId && bot.createdById === userId;
  }
  if (!bot.planId) return true;
  if (!userPlan) return false;
  return userPlan.price >= (bot.plan?.price ?? 0);
}

export function ChatArea({
  bots,
  initialConversationId,
  initialMessages,
  initialBotId,
  conversationBotId,
  userPlan,
  userId,
  allowCustomBots,
}: {
  bots: Bot[];
  initialConversationId: string | null;
  initialMessages: DBMessage[];
  initialBotId: string | null;
  conversationBotId: string | null;
  userPlan: UserPlan;
  userId: string | null;
  allowCustomBots: boolean;
}) {
  const router = useRouter();
  const toggleSidebar = useSidebarToggle();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [input, setInput] = useState("");
  const [selectedBotId, setSelectedBotId] = useState(() => {
    if (initialBotId) return initialBotId;
    if (conversationBotId) return conversationBotId;
    // Paid users default to first MODEL bot, free/unauth to first free SYSTEM bot
    if (userPlan) {
      const firstModel = bots.find((b) => b.type === "MODEL");
      if (firstModel) return firstModel.id;
    }
    const firstFreeSystem = bots.find((b) => b.type === "SYSTEM" && !b.planId);
    return firstFreeSystem?.id || bots[0]?.id || "";
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [hitDailyLimit, setHitDailyLimit] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputBeforeSpeechRef = useRef("");
  const wantsRecordingRef = useRef(false);

  const modelBots = useMemo(() => bots.filter((b) => b.type === "MODEL"), [bots]);
  const systemBots = useMemo(() => bots.filter((b) => b.type === "SYSTEM"), [bots]);
  const userBots = useMemo(() => bots.filter((b) => b.type === "USER"), [bots]);

  const selectedBot = bots.find((b) => b.id === selectedBotId);
  const isSwitchingBot =
    conversationBotId && selectedBotId !== conversationBotId;
  const canUseBot = selectedBot ? canAccessBot(selectedBot, userPlan, userId) : false;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  // Intercept fetch to capture X-Conversation-Id from the response
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  const customFetch: typeof globalThis.fetch = async (input, init) => {
    const response = await globalThis.fetch(input, init);
    const newId = response.headers.get("X-Conversation-Id");
    if (newId && !conversationIdRef.current) {
      setConversationId(newId);
      window.history.replaceState(null, "", `/chat/${newId}`);
    }
    const remaining = response.headers.get("X-Messages-Remaining");
    if (remaining !== null) {
      setMessagesRemaining(parseInt(remaining, 10));
    }
    return response;
  };

  const transport = useMemo(
    () => new DefaultChatTransport({ fetch: customFetch }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId || undefined,
    messages: dbToUIMessages(initialMessages),
    transport,
    onFinish: () => {
      router.refresh();
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingMessage]);

  // Clear pending message once the hook picks it up
  useEffect(() => {
    if (pendingMessage && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "user") {
        setPendingMessage(null);
      }
    }
  }, [messages, pendingMessage]);

  useEffect(() => {
    if (error?.message?.includes("Daily message limit")) {
      setHitDailyLimit(true);
    }
  }, [error]);

  useEffect(() => {
    if (!hitDailyLimit) return;
    function update() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setCountdown(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [hitDailyLimit]);

  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" &&
        !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }, []);

  useEffect(() => {
    return () => {
      wantsRecordingRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  function toggleRecording() {
    if (isRecording) {
      wantsRecordingRef.current = false;
      recognitionRef.current?.stop();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SR() as any;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    inputBeforeSpeechRef.current = input;
    wantsRecordingRef.current = true;

    recognition.addEventListener("result", (e: any) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      const prefix = inputBeforeSpeechRef.current;
      const space = prefix && !prefix.endsWith(" ") ? " " : "";
      setInput(prefix + space + final + interim);
    });

    recognition.addEventListener("error", (e: any) => {
      if (e.error === "no-speech") return;
      console.error("Speech error:", e.error);
      wantsRecordingRef.current = false;
      setIsRecording(false);
    });

    recognition.addEventListener("end", () => {
      if (wantsRecordingRef.current) {
        recognition.start();
      } else {
        setIsRecording(false);
      }
    });

    recognition.start();
    setIsRecording(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setSignInOpen(true);
      return;
    }
    if (!input.trim() || isLoading || !canUseBot) return;
    if (isRecording) {
      wantsRecordingRef.current = false;
      recognitionRef.current?.stop();
    }

    const text = input;
    setInput("");
    setPendingMessage(text);

    await sendMessage(
      { text },
      {
        body: {
          botId: selectedBotId,
          conversationId: isSwitchingBot ? undefined : conversationId,
        },
      }
    );
  };

  function getTextContent(message: (typeof messages)[0]): string {
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  }

  // Find the cheapest plan that would unlock the selected bot
  const requiredPlan = selectedBot?.plan;

  return (
    <div className="flex h-full flex-col">
      {/* Bot selector */}
      <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 md:px-6 dark:border-zinc-800">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {selectedBot?.name || "Select a bot"}
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 w-64 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
              <div className="max-h-80 overflow-y-auto p-1">
                {modelBots.length > 0 && (
                  <>
                    <p className="px-3 py-1 text-xs font-medium text-zinc-400">
                      Models
                    </p>
                    {modelBots.map((bot) => {
                      const locked = !canAccessBot(bot, userPlan, userId);
                      return (
                        <button
                          key={bot.id}
                          onClick={() => {
                            if (!locked) {
                              setSelectedBotId(bot.id);
                              setDropdownOpen(false);
                            }
                          }}
                          disabled={locked}
                          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                            locked
                              ? "cursor-not-allowed text-zinc-400 dark:text-zinc-500"
                              : bot.id === selectedBotId
                                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50"
                                : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
                          }`}
                        >
                          <span className="truncate">{bot.name}</span>
                          {locked && (
                            <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-400" />
                          )}
                        </button>
                      );
                    })}
                  </>
                )}

                {systemBots.length > 0 && (
                  <>
                    {modelBots.length > 0 && (
                      <div className="mx-2 my-1 border-t border-zinc-200 dark:border-zinc-700" />
                    )}
                    <p className="px-3 py-1 text-xs font-medium text-zinc-400">
                      System Bots
                    </p>
                    {systemBots.map((bot) => (
                      <button
                        key={bot.id}
                        onClick={() => {
                          setSelectedBotId(bot.id);
                          setDropdownOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          bot.id === selectedBotId
                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50"
                            : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
                        }`}
                      >
                        <span className="truncate">{bot.name}</span>
                        {!canAccessBot(bot, userPlan, userId) && (
                          <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-400" />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {userId && userBots.length > 0 && (
                  <>
                    <div className="mx-2 my-1 border-t border-zinc-200 dark:border-zinc-700" />
                    <p className="px-3 py-1 text-xs font-medium text-zinc-400">
                      My Bots
                    </p>
                    {userBots.map((bot) => (
                      <button
                        key={bot.id}
                        onClick={() => {
                          setSelectedBotId(bot.id);
                          setDropdownOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          bot.id === selectedBotId
                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50"
                            : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
                        }`}
                      >
                        <span className="truncate">{bot.name}</span>
                      </button>
                    ))}
                  </>
                )}

                {userId && allowCustomBots && (
                  <>
                    <div className="mx-2 my-1 border-t border-zinc-200 dark:border-zinc-700" />
                    <a
                      href="/bots/new"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create bot
                    </a>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedBot && (
          <span className="hidden text-xs text-zinc-400 sm:inline">
            {selectedBot.description}
          </span>
        )}
      </div>

      {/* Bot switch warning */}
      {isSwitchingBot && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          Sending a message will start a new chat with{" "}
          <strong>{selectedBot?.name}</strong>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
        {messages.length === 0 && !pendingMessage ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <BotIcon className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {selectedBot?.name || "Select a bot"}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              {selectedBot?.description || "Choose a bot to start chatting"}
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    message.role === "user"
                      ? "bg-zinc-200 dark:bg-zinc-700"
                      : "bg-zinc-900 dark:bg-zinc-100"
                  }`}
                >
                  {message.role === "user" ? (
                    <User className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                  ) : (
                    <BotIcon className="h-4 w-4 text-white dark:text-zinc-900" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="mb-1 text-xs font-medium text-zinc-500">
                    {message.role === "user"
                      ? "You"
                      : selectedBot?.name || "Bot"}
                  </p>
                  {message.role === "user" ? (
                    <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert">
                      <p className="whitespace-pre-wrap">
                        {getTextContent(message)}
                      </p>
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert">
                      <Markdown>{getTextContent(message)}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {pendingMessage && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <User className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="mb-1 text-xs font-medium text-zinc-500">You</p>
                  <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert">
                    <p className="whitespace-pre-wrap">{pendingMessage}</p>
                  </div>
                </div>
              </div>
            )}
            {(pendingMessage || (isLoading &&
              messages[messages.length - 1]?.role === "user")) && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100">
                    <BotIcon className="h-4 w-4 text-white dark:text-zinc-900" />
                  </div>
                  <div className="pt-1">
                    <p className="mb-1 text-xs font-medium text-zinc-500">
                      {selectedBot?.name || "Bot"}
                    </p>
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            {status === "error" && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="mb-1 text-xs font-medium text-red-500">Error</p>
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
                    {error?.message?.includes("Daily message limit")
                      ? "You've hit your daily message limit. Upgrade for more messages."
                      : error?.message?.includes("Upgrade required")
                        ? "This bot requires a paid plan."
                        : "Something went wrong. Please try again."}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 px-4 py-4 md:px-6 dark:border-zinc-800">
        {!userId ? (
          <button
            onClick={() => setSignInOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Sign in to start chatting
          </button>
        ) : hitDailyLimit ? (
          <div className="mx-auto max-w-3xl">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Demo limit reached
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    This demo caps messages at {userPlan ? "50" : "20"}/day.
                    Resets in{" "}
                    <span className="font-mono font-semibold">{countdown}</span>
                    {" "}(UTC)
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : !canUseBot ? (
          <a
            href={requiredPlan?.checkoutUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-950"
          >
            <Lock className="h-4 w-4" />
            Upgrade to {requiredPlan?.name || "a paid plan"} to chat with{" "}
            {selectedBot?.name}
          </a>
        ) : (
          <>
            {messagesRemaining !== null && userId && (
              <p className="mb-2 text-center text-xs text-zinc-400">
                {messagesRemaining} messages remaining today
              </p>
            )}
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-3xl items-center gap-2"
            >
              <div className="flex flex-1 items-center rounded-lg border border-zinc-200 bg-white focus-within:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:focus-within:border-zinc-500">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Send a message..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className="mr-2 shrink-0 rounded-md p-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    {isRecording ? (
                      <MicOff className="h-4 w-4 animate-pulse text-red-500" />
                    ) : (
                      <Mic className="h-4 w-4 text-zinc-400" />
                    )}
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="self-stretch rounded-lg bg-zinc-900 px-2.5 text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>

      {/* Sign in modal */}
      <SignInModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}
