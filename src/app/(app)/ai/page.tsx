"use client";

import { useState, useRef, useEffect } from "react";
import { usePlan } from "@/lib/usePlan";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Send, Bot, Sparkles, Lock, TrendingUp, Wallet, Target, BarChart3 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; id: string };

const QUICK_PROMPTS = [
  { icon: TrendingUp, text: "How is my net worth trending?" },
  { icon: Wallet, text: "Where am I overspending this month?" },
  { icon: Target, text: "Am I on track to hit my savings goal?" },
  { icon: BarChart3, text: "Summarize my spending this month" },
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMd(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1 rounded text-[0.85em]">$1</code>');
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed === "") return <div key={i} className="h-1" />;
        if (/^#{1,4}\s/.test(trimmed)) {
          return <p key={i} className="font-bold mt-1" dangerouslySetInnerHTML={{ __html: inlineMd(trimmed.replace(/^#{1,4}\s/, "")) }} />;
        }
        if (/^([•\-*])\s/.test(trimmed)) {
          return (
            <p key={i} className="flex gap-2 pl-1">
              <span>•</span>
              <span dangerouslySetInnerHTML={{ __html: inlineMd(trimmed.replace(/^([•\-*])\s/, "")) }} />
            </p>
          );
        }
        return <p key={i} dangerouslySetInnerHTML={{ __html: inlineMd(line) }} />;
      })}
    </div>
  );
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      content: `Hi there! 👋 I'm your Credo AI Assistant. I have access to your accounts, transactions, budgets, and investments — so I can give you personalized financial insights.\n\nWhat would you like to know about your finances today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Usage is tracked server-side (per user, per month) so it can't be reset
  // by switching tabs or reloading. null = unlimited (Pro).
  const [usage, setUsage] = useState<{ used: number; limit: number | null }>({ used: 0, limit: null });
  const [usageLoaded, setUsageLoaded] = useState(false);
  const { plan, limits } = usePlan();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load real usage from the server on mount
  useEffect(() => {
    fetch("/api/ai/usage")
      .then((r) => r.json())
      .then((d) => setUsage({ used: d.used ?? 0, limit: d.limit ?? null }))
      .catch(() => {})
      .finally(() => setUsageLoaded(true));
  }, []);

  const maxQuestions = usage.limit; // from server, authoritative

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    if (maxQuestions !== null && usage.used >= maxQuestions) return;

    const userMsg: Message = { id: `u${Date.now()}`, role: "user", content: msg };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .filter((m) => m.id !== "intro")
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      // Server returns authoritative usage on both success and limit-reached
      if (data.usage) setUsage({ used: data.usage.used, limit: data.usage.limit });
      const reply = res.ok
        ? data.reply
        : `⚠️ ${data.error ?? "Something went wrong. Please try again."}`;
      setMessages((prev) => [...prev, { id: `a${Date.now()}`, role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `a${Date.now()}`, role: "assistant", content: "⚠️ Network error — I couldn't reach the server. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const nextResetLabel = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  })();
  const atLimit = maxQuestions !== null && usage.used >= maxQuestions;
  const questionsUsed = usage.used;

  return (
    <div className="flex h-full flex-col p-4 sm:p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-orange-400" /> AI Assistant
          </h1>
          <p className="text-sm text-stone-400">Powered by your real financial data</p>
        </div>
        <div className="flex items-center gap-3">
          {maxQuestions !== null ? (
            <>
              <span className="text-xs text-stone-400">{questionsUsed}/{maxQuestions} questions used</span>
              <div className="w-24 h-1.5 bg-[#ffffff12] rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(questionsUsed / maxQuestions) * 100}%` }} />
              </div>
            </>
          ) : (
            <span className="text-xs text-stone-400">Unlimited questions ✨</span>
          )}
          <Badge variant={plan === "FREE" ? "muted" : "success"}>{limits.label} plan</Badge>
        </div>
      </div>

      {/* Messages */}
      <Card className="flex-1 flex flex-col overflow-hidden mb-4">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-orange-500 text-white rounded-tr-sm" : "bg-[#ffffff12] text-stone-200 rounded-tl-sm"}`}>
                {msg.role === "assistant" ? <MarkdownText text={msg.content} /> : msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-orange-400" />
              </div>
              <div className="bg-[#ffffff12] rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 150, 300].map((d) => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-stone-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(({ icon: Icon, text }) => (
              <button
                key={text}
                onClick={() => send(text)}
                className="flex items-center gap-1.5 text-xs border border-[#ffffff14] rounded-full px-3 py-1.5 hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-300 transition-colors text-stone-400"
              >
                <Icon className="w-3 h-3" /> {text}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Input */}
      {atLimit ? (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-300">Monthly question limit reached</p>
            <p className="text-xs text-amber-400">
              You&apos;ve used all {maxQuestions} of your AI questions this month. Your limit resets on {nextResetLabel}. Upgrade to Plus for 50/mo or Pro for unlimited.
            </p>
          </div>
          <a href="/billing"><Button size="sm">Upgrade</Button></a>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask anything about your finances..."
            disabled={loading}
            className="flex-1 border border-[#ffffff14] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 disabled:opacity-50"
          />
          <Button onClick={() => send()} disabled={!input.trim() || loading} className="px-4">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}

      <p className="text-xs text-stone-500 text-center mt-2">
        AI responses are based on your connected data. Not financial advice.
      </p>
    </div>
  );
}
