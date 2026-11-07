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
// Groq retired llama-3.3-70b-versatile on 2026-08-16 (requests now 404).
// Default to its recommended replacement; override with GROQ_MODEL in Vercel
// so future retirements don't need a code change.
// https://console.groq.com/docs/deprecations
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

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

  const systemPrompt = `You are Credo Coach, a personal finance coach built into the Credo app. The user's name is ${firstName}.

${live
    ? `You have access to the user's financial data below. Ground every answer in this data: cite specific numbers, merchants, categories, and dates. Do arithmetic carefully and show totals when useful.

=== FINANCIAL DATA ===
${context}
=== END FINANCIAL DATA ===`
    : `The user has NOT connected any bank accounts yet, so you have no financial data about them. Answer general personal-finance questions helpfully, and when relevant, suggest they connect a bank account (via the "Connect Account" button) so you can give personalized insights. Never invent specific numbers about their finances.`}

HOW TO ANSWER
- Open with the direct answer in one or two sentences. No preamble like "Great question".
- Then give the supporting detail, formatted in Markdown:
  - Use short "### " section headings when the answer has more than one part.
  - Use bullet lists for options, causes or steps; numbered lists for ordered steps.
  - Put key numbers in **bold** (for example **$288/yr**).
  - Use a Markdown table when comparing options, months or accounts side by side.
  - Keep paragraphs to 1–3 sentences. Aim for under 250 words unless the user asks for more detail.
- Act as a coach: when the data includes a FINANCIAL HEALTH SCORE, use it to explain where the user stands and which indicator matters most. For "can I afford…" or "what if…" questions, work through the effect on their cash, upcoming bills and score.
- When the data includes FINANCIAL BLIND SPOTS, or the user asks about one: explain it simply, say what it will cost or risk if ignored (use the numbers given), recommend the single most appropriate next step, and say how resolving it would help their health score. Distinguish verified findings from "likely" or "possible" ones; never claim a subscription is unused.
- Finish advice with a line that starts with "**Next step:**" and one specific action the user can take this week.
- Never say you have moved money, cancelled a service or contacted anyone. You only suggest actions the user takes themselves.
- You provide financial information and coaching, NOT licensed financial, legal, tax, or investment advice. For major decisions, suggest consulting a professional, briefly and without being preachy.
- If asked something unrelated to personal finance, politely steer back to the user's finances.
- Never invent data that isn't in the snapshot above. If you don't have the data needed, say so.
- After everything else, on the very last line, write exactly "FOLLOWUPS:" followed by three short follow-up questions the user might ask next, separated by " | ". The app turns these into buttons and hides this line.`;

  // Ask Groq for a streamed answer so the reply appears as it's written.
  let upstream: Response;
  try {
    upstream = await fetch(GROQ_URL, {
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
        // gpt-oss is a reasoning model: reasoning tokens count toward the
        // limit, so keep reasoning light and leave room for the answer.
        ...(MODEL.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
        max_completion_tokens: 2048,
        stream: true,
      }),
    });
  } catch (err: unknown) {
    console.error("AI chat error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The coach is unavailable right now. Please try again." }, { status: 500 });
  }

  if (!upstream.ok || !upstream.body) {
    const errBody = await upstream.text().catch(() => "");
    console.error("Groq API error:", upstream.status, MODEL, errBody);
    // Surface Groq's own message (never contains secrets) so problems like a
    // retired model or invalid key are diagnosable from the UI.
    let detail = "";
    try { detail = (JSON.parse(errBody)?.error?.message as string | undefined)?.slice(0, 200) ?? ""; } catch {}
    return NextResponse.json(
      { error: `AI request failed (${upstream.status}${upstream.status === 404 ? `, model "${MODEL}"` : ""}).${detail ? ` ${detail}` : ""} Please try again.` },
      { status: 502 }
    );
  }

  // Re-stream only the answer text (Groq sends SSE; reasoning deltas are dropped).
  // The question is counted once the answer has finished streaming.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      let wrote = false;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta) {
                controller.enqueue(encoder.encode(delta));
                wrote = true;
              }
            } catch {
              /* ignore keep-alives / partial frames */
            }
          }
        }
        if (!wrote) controller.enqueue(encoder.encode("Sorry, I couldn't generate a response. Please try asking again."));
        else if (databaseConfigured()) {
          await getPrisma().aiUsage.upsert({
            where: { userId_month: { userId, month } },
            update: { count: { increment: 1 } },
            create: { userId, month, count: 1 },
          });
        }
      } catch (err) {
        console.error("AI stream error:", err instanceof Error ? err.message : err);
        controller.enqueue(encoder.encode("\n\n_The answer was interrupted. Please try again._"));
      } finally {
        controller.close();
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      // Usage after this answer (the server is authoritative).
      "X-AI-Usage-Used": String(limit !== null && databaseConfigured() ? used + 1 : used),
      "X-AI-Usage-Limit": limit === null ? "unlimited" : String(limit),
      "X-AI-Live": live ? "1" : "0",
    },
  });
}
