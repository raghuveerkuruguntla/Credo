// ─────────────────────────────────────────────────────────────────────────────
// Prompt-injection defences for the AI coach (server side).
//
// Threats handled:
//   1. Untrusted text inside the financial data (merchant names, account and
//      institution names come from banks and can contain anything, including
//      "ignore previous instructions…"). → sanitised, length-capped, and fenced
//      inside a per-request random delimiter the model is told to treat as data.
//   2. Forged conversation history (a client sending fake "assistant" turns to
//      put words in the coach's mouth). → every finished answer is HMAC-signed
//      for that user; unsigned or tampered assistant turns are dropped.
//   3. User-controlled profile fields (first name). → sanitised.
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/** Make an untrusted string safe to place inside the data block. */
export function sanitizeForPrompt(raw: unknown, max = 80): string {
  return String(raw ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, " ") // control, zero-width, bidi
    .replace(/[<>{}[\]`|\\]/g, " ")           // no tag/markup/fence characters
    .replace(/={2,}|-{3,}|#{2,}|\*{2,}/g, " ") // no section-like separators
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** A first name safe for the system prompt (letters, spaces, hyphens, apostrophes). */
export function sanitizeName(raw: unknown): string {
  const s = String(raw ?? "").normalize("NFKC").replace(/[^\p{L}\p{M}' -]/gu, "").trim().slice(0, 40);
  return s || "there";
}

/** Random delimiter so data can't fake the end of its own block. */
export function dataFence(): { open: string; close: string; id: string } {
  const id = randomBytes(8).toString("hex");
  return { id, open: `<financial_data id="${id}">`, close: `</financial_data id="${id}">` };
}

// ── Signed assistant history ────────────────────────────────────────────────

export const SIG_MARK = "\u001eCREDO-SIG:";

function signingKey(): string {
  const k = process.env.AI_SIGNING_SECRET || process.env.ENCRYPTION_KEY || process.env.CLERK_SECRET_KEY;
  if (!k) throw new Error("No signing secret configured");
  return k;
}

/** Normalise an answer the same way on signing and verifying. */
export function canonicalAnswer(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

export function signAnswer(userId: string, text: string): string {
  return createHmac("sha256", signingKey()).update(`${userId}\n${canonicalAnswer(text)}`).digest("hex");
}

export function verifyAnswer(userId: string, text: string, sig: unknown): boolean {
  if (typeof sig !== "string" || !/^[0-9a-f]{64}$/.test(sig)) return false;
  try {
    const expected = Buffer.from(signAnswer(userId, text), "hex");
    const given = Buffer.from(sig, "hex");
    return expected.length === given.length && timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

/** Remove the UI-only "FOLLOWUPS:" line before an answer goes back to the model. */
export function stripFollowups(text: string): string {
  return text.replace(/(^|\n)\s*\**FOLLOWUPS:?[\s\S]*$/i, "").trimEnd();
}
