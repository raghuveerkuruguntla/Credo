import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { buildFinancialContext } from "@/lib/financial-context";
import { getPrisma, databaseConfigured } from "@/lib/db";
import { entitlementsFor } from "@/lib/entitlements";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

// Bound per-request prompt size so a single call can't run up token cost.
const MAX_MESSAGES = 10;         // most recent turns sent to the model
const MAX_MESSAGE_CHARS = 2000;  // per message
const MAX_TOTAL_CHARS = 12000;   // across all messages in a request

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function nextResetDate(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured. Add GROQ_API_KEY to .env.local." },
      { status: 503 }
    );
  }

  // Burst rate limit (per user) — caps cost even for unlimited (Pro) plans.
  const limited = await enforceRateLimit(`ai:${userId}`, LIMITS.ai);
  if (limited) return limited;

  const user = await currentUser();
  const ent = entitlementsFor(user?.publicMetadata?.plan);
  const limit = ent.aiQuestions; // null = unlimited (Pro)
  const month = currentMonth();

  // Server-enforced monthly question limit
  let used = 0;
  if (limit !== null && databaseConfigured()) {
    const rec = await getPrisma().aiUsage.findUnique({
      where: { userId_month: { userId, month } },
    });
    used = rec?.count ?? 0;
    if (used >= limit) {
      return NextResponse.json(
        {
          error: `You've used all ${limit} AI questions for this month. Your limit resets on ${nextResetDate()}. Upgrade your plan for more questions.`,
          limitReached: true,
          usage: { used, limit },
        },
        { status: 429 }
      );
    }
  }

  const { messages } = (await request.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  // Sanitize + bound the input so a request can't blow up token usage: keep only
  // valid roles, take the most recent turns, and clamp each message's length.
  let running = 0;
  const cleanMessages = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
    .filter((m) => {
      if (m.content.trim() === "" || running >= MAX_TOTAL_CHARS) return false;
      running += m.content.length;
      return true;
    });
  if (cleanMessages.length === 0) {
    return NextResponse.json({ error: "No valid message content provided" }, { status: 400 });
  }

  const firstName = user?.firstName ?? "there";
  const { context, live } = await buildFinancialContext(userId);

  const systemPrompt = `You are the Credo AI Assistant — a personal finance copilot embedded in the Credo app. The user's name is ${firstName}.

${live
    ? `You have access to the user's financial data below. Ground every answer in this data: cite specific numbers, merchants, categories, and dates. Do simple arithmetic carefully and show totals when useful.

=== FINANCIAL DATA ===
${context}
=== END FINANCIAL DATA ===`
    : `The user has NOT connected any bank accounts yet, so you have no financial data about them. Answer general personal-finance questions helpfully, and when relevant, suggest they connect a bank account (via the "Connect Account" button) so you can give personalized insights. Never invent specific numbers about their finances.`}

Guidelines:
- Be concise, friendly, and practical. Use short paragraphs and bullet lists. Markdown formatting (bold, lists) is supported.
- Give actionable recommendations (e.g., specific categories to cut, savings targets) when the user asks for advice.
- You provide financial information and budgeting support, NOT licensed financial, legal, tax, or investment advice. For major decisions, suggest consulting a professional — briefly, without being preachy.
- If asked something unrelated to personal finance, politely steer back to the user's finances.
- Never invent data that isn't in the snapshot above. If you don't have the data needed, say so.`;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...cleanMessages,
        ],
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Groq API error:", res.status, errBody);
      return NextResponse.json(
        { error: `AI request failed (${res.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

    // Count this question (only after a successful reply)
    if (databaseConfigured()) {
      await getPrisma().aiUsage.upsert({
        where: { userId_month: { userId, month } },
        update: { count: { increment: 1 } },
        create: { userId, month, count: 1 },
      });
      used += 1;
    }

    return NextResponse.json({ reply, live, usage: { used, limit } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
