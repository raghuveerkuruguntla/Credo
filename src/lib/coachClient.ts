"use client";

// Client helpers for talking to the AI coach.

const QUEUE_KEY = "credo.coach.ask";
export const SIG_MARK = "\u001eCREDO-SIG:";

/**
 * Hand a question to the coach page. In-app "Ask the coach" buttons use this
 * (session storage), so only the app itself can auto-send a question; a
 * /ai?ask= link from anywhere else only pre-fills the box for the user to
 * review. This stops crafted links from making the coach act on their own.
 */
export function queueCoachQuestion(q: string) {
  try { sessionStorage.setItem(QUEUE_KEY, q.slice(0, 1500)); } catch {}
}
export function takeQueuedQuestion(): string | null {
  try {
    const q = sessionStorage.getItem(QUEUE_KEY);
    sessionStorage.removeItem(QUEUE_KEY);
    return q;
  } catch {
    return null;
  }
}

/** Split the server's signature trailer from streamed text (safe mid-stream). */
export function splitSignature(raw: string): { text: string; sig: string | null } {
  const i = raw.indexOf("\u001e");
  if (i < 0) return { text: raw, sig: null };
  const tail = raw.slice(i);
  const sig = tail.startsWith(SIG_MARK) ? tail.slice(SIG_MARK.length).trim() : "";
  return { text: raw.slice(0, i), sig: /^[0-9a-f]{64}$/.test(sig) ? sig : null };
}

/** One-shot question (no history), e.g. budget suggestions. */
export async function askCoachOnce(question: string): Promise<{ text: string | null; error: string | null }> {
  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: question }] }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { text: null, error: data.error ?? "Couldn't reach the coach. Please try again." };
    }
    const raw = await res.text();
    return { text: splitSignature(raw).text, error: null };
  } catch {
    return { text: null, error: typeof navigator !== "undefined" && !navigator.onLine ? "You're offline. The AI coach needs an internet connection; reconnect and try again." : "Network error: couldn't reach the server." };
  }
}
