"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { splitSignature, takeQueuedQuestion } from "@/lib/coachClient";
import ChatMarkdown, { splitFollowups } from "@/components/ChatMarkdown";
import { cn } from "@/lib/utils";
import {
  ArrowUp, Square, Sparkles, Wallet, Target, HeartPulse, TrendingUp, Copy, Check, RotateCcw,
  SquarePen, AlertTriangle, CornerDownRight,
} from "lucide-react";

type Message = { id: string; role: "user" | "assistant"; content: string; error?: boolean; sig?: string | null };

const QUICK_PROMPTS = [
  { icon: HeartPulse, title: "Why is my score this number?", sub: "walk me through each category", text: "Why is my financial health score this number?" },
  { icon: Target, title: "What am I overlooking?", sub: "insights I might be missing", text: "What am I overlooking?" },
  { icon: Wallet, title: "What's hurting my score most?", sub: "and how to improve my weakest category", text: "What's hurting my score the most, and how can I improve my weakest category?" },
  { icon: TrendingUp, title: "Biggest improvement", sub: "which action helps my finances most", text: "Which action would improve my finances the most?" },
];

const THINKING = ["Reading your accounts…", "Checking recent transactions…", "Looking at your health score…", "Putting it together…"];

function ThinkingIndicator() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, THINKING.length - 1)), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2.5 text-sm text-stone-400" role="status" aria-live="polite">
      <span className="flex gap-1">
        {[0, 150, 300].map((d) => <span key={d} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
      </span>
      {THINKING[step]}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy answer"
      title="Copy"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {});
      }}
      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
    >
      {done ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export default function AIPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [waitingFirstToken, setWaitingFirstToken] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickToBottom = useRef(true);


  // Keep the newest text in view while streaming, unless the user scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, waitingFirstToken]);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // Auto-grow the composer.
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const ask = useCallback(async (history: Message[]) => {
    if (streaming) return;
    const assistantId = `a${Date.now()}`;
    setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);
    setWaitingFirstToken(true);
    stickToBottom.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    const update = (content: string, error = false, sig: string | null = null) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content, error, sig } : m)));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          // Assistant turns go back exactly as received, with the server's
          // signature; unsigned ones (errors, stopped answers) are left out.
          messages: history.filter((m) => !m.error && (m.role === "user" || m.sig)).map(({ role, content, sig }) => (role === "assistant" ? { role, content, sig } : { role, content })),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setWaitingFirstToken(false);
        const wait = res.status === 429 && data.retryAfterSec ? ` You can ask again in about ${Math.ceil(data.retryAfterSec / 60) > 1 ? `${Math.ceil(data.retryAfterSec / 60)} minutes` : "a minute"}.` : "";
        update((res.status === 429 ? "You're asking questions faster than the coach can keep up." : data.error ?? "Something went wrong. Please try again.") + wait, true);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const { text: visible } = splitSignature(text);
        if (visible) setWaitingFirstToken(false);
        update(visible);
      }
      setWaitingFirstToken(false);
      const { text: finalText, sig } = splitSignature(text);
      if (!finalText.trim()) update("Sorry, I couldn't generate a response. Please try again.", true);
      else update(finalText, false, sig);
    } catch (err) {
      setWaitingFirstToken(false);
      if ((err as Error)?.name === "AbortError") {
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content ? m.content + "\n\n_Stopped._" : "_Stopped._" } : m)));
      } else {
        update("Network error: I couldn't reach the server. Please try again.", true);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [streaming]);

  const send = useCallback((text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
    setInput("");
    ask([...messages, { id: `u${Date.now()}`, role: "user", content: msg }]);
  }, [input, streaming, messages, ask]);

  const regenerate = () => {
    if (streaming) return;
    const lastUser = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUser < 0) return;
    ask(messages.slice(0, messages.length - lastUser));
  };

  const newChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  // "Ask the coach" buttons inside the app queue their question in session
  // storage, and only those are sent automatically. A /ai?ask= link (which
  // anyone could craft) just pre-fills the box so the user sees it first.
  const askedRef = useRef(false);
  useEffect(() => {
    if (askedRef.current) return;
    askedRef.current = true;
    const queued = takeQueuedQuestion();
    if (queued) { send(queued); return; }
    const q = new URLSearchParams(window.location.search).get("ask");
    if (q) {
      window.history.replaceState(null, "", window.location.pathname);
      setInput(q.slice(0, 1500));
      inputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const empty = messages.length === 0;

  return (
    <div className="flex h-[100cqh] min-h-0 flex-col w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.35)]">
            <Sparkles className="w-4 h-4 text-white" />
          </span>
          <div>
            <h1 className="text-base font-semibold text-stone-100 leading-tight">Credo Coach</h1>
            <p className="text-xs text-stone-500">Answers from your real accounts</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!empty && (
            <button type="button" onClick={newChat} className="inline-flex items-center gap-1.5 text-xs text-stone-300 px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/[0.06] cursor-pointer">
              <SquarePen className="w-3.5 h-3.5" /> New chat
            </button>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {empty ? (
            <div className="pt-6 sm:pt-14">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_32px_rgba(99,102,241,0.4)] mb-5">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                Hi{user?.firstName ? ` ${user.firstName}` : ""}, what would you like to know about your money?
              </h2>
              <p className="text-stone-400 mt-2">I can see your accounts, recent transactions, health score and insights, so my answers are about your situation, not money in general.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                {QUICK_PROMPTS.map(({ icon: Icon, title, sub, text }) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => send(text)}
                    disabled={streaming}
                    className="group text-left rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-indigo-500/30 p-4 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icon className="w-5 h-5 text-indigo-400 mb-2.5" />
                    <span className="block text-sm font-medium text-stone-100">{title}</span>
                    <span className="block text-xs text-stone-500 mt-0.5">{sub}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((m) => {
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-white/[0.07] border border-white/[0.06] px-4 py-2.5 text-[15px] text-stone-100 whitespace-pre-wrap break-words">
                        {m.content}
                      </div>
                    </div>
                  );
                }
                const isLast = m.id === lastAssistantId;
                const isStreamingThis = isLast && streaming;
                const { body, followups } = splitFollowups(m.content);
                return (
                  <div key={m.id} className="flex gap-3 sm:gap-4">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-stone-400 mb-1.5">Credo Coach</p>
                      {m.error ? (
                        <div className="flex gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{m.content}</span>
                        </div>
                      ) : isStreamingThis && waitingFirstToken ? (
                        <ThinkingIndicator />
                      ) : (
                        <div className={cn(isStreamingThis && "coach-streaming")}>
                          <ChatMarkdown text={body} />
                          {isStreamingThis && <span className="inline-block w-2 h-4 align-middle bg-indigo-400/80 animate-pulse ml-0.5" aria-hidden />}
                        </div>
                      )}

                      {!isStreamingThis && !m.error && body && (
                        <div className="flex items-center gap-1 mt-3 -ml-1.5">
                          <CopyButton text={body} />
                          {isLast && (
                            <button type="button" onClick={regenerate} aria-label="Regenerate answer" title="Regenerate" className="p-1.5 rounded-lg text-stone-500 hover:text-stone-200 hover:bg-white/[0.06] transition-colors cursor-pointer">
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                      {m.error && isLast && (
                        <button type="button" onClick={regenerate} className="mt-2 inline-flex items-center gap-1.5 text-xs text-stone-300 hover:text-white cursor-pointer">
                          <RotateCcw className="w-3.5 h-3.5" /> Try again
                        </button>
                      )}

                      {isLast && !streaming && followups.length > 0 && (
                        <div className="mt-4 flex flex-col items-start gap-2">
                          {followups.map((q) => (
                            <button key={q} type="button" onClick={() => send(q)} className="inline-flex items-center gap-2 text-left text-sm text-stone-300 rounded-xl border border-white/[0.08] px-3 py-2 hover:bg-white/[0.05] hover:border-indigo-500/30 hover:text-white transition-colors cursor-pointer">
                              <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="px-4 sm:px-6 pb-4 pt-2">
        <div className="max-w-3xl mx-auto">
            <div className="relative rounded-2xl border border-white/[0.1] bg-white/[0.03] focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-colors">
              <label htmlFor="coach-input" className="sr-only">Message Credo Coach</label>
              <textarea
                id="coach-input"
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about your spending, debt, savings, or a decision you're weighing…"
                className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-12 text-[15px] text-stone-100 placeholder:text-stone-500 focus:outline-none"
              />
              <div className="absolute bottom-2.5 left-4 right-2.5 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 hidden sm:inline">Enter to send · Shift + Enter for a new line</span>
                <span className="sm:hidden" />
                {streaming ? (
                  <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop generating" className="w-9 h-9 rounded-xl bg-white/[0.12] hover:bg-white/[0.18] flex items-center justify-center cursor-pointer">
                    <Square className="w-3.5 h-3.5 text-white fill-white" />
                  </button>
                ) : (
                  <button type="button" onClick={() => send()} disabled={!input.trim()} aria-label="Send message" className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 disabled:from-white/[0.08] disabled:to-white/[0.08] flex items-center justify-center cursor-pointer disabled:cursor-not-allowed transition-colors">
                    <ArrowUp className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            </div>
          <p className="text-[11px] text-stone-500 text-center mt-2">Based on your connected data. Coaching, not licensed financial advice. Credo never moves money for you.</p>
        </div>
      </div>
    </div>
  );
}
