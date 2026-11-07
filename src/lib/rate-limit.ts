import { getPrisma, databaseConfigured } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// Fixed-window rate limiter.
//
// Cost control: the AI (Groq) and Plaid endpoints cost real money per call, so
// every user is capped to a budget per time window (for the AI coach: per
// minute, per hour and per day). This stops a runaway client loop, a stuck retry,
// or an abusive user from driving up the bill.
//
// Backend: Postgres (the Neon DB the app already uses), via a self-provisioning
// "RateLimit" table and a single atomic upsert — so it is correct across all
// serverless instances without adding Redis/Upstash or a migration step. Falls
// back to a best-effort in-memory limiter only when no DATABASE_URL is set
// (local/keyless dev). Fails OPEN on any DB error so the limiter can never take
// the app down — a cost guard should never become an availability risk.
// ─────────────────────────────────────────────────────────────────────────────

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  limit: number;
}

// ── In-memory fallback (single instance; dev / no-DB only) ───────────────────
const mem = new Map<string, { count: number; resetAt: number }>();

function memLimit(key: string, limit: number, windowSec: number): RateResult {
  const now = Date.now();
  const e = mem.get(key);
  if (!e || e.resetAt <= now) {
    mem.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSec: windowSec, limit };
  }
  e.count += 1;
  return {
    ok: e.count <= limit,
    remaining: Math.max(0, limit - e.count),
    retryAfterSec: Math.max(1, Math.ceil((e.resetAt - now) / 1000)),
    limit,
  };
}

// ── Postgres backend ─────────────────────────────────────────────────────────
let tableReady = false;
async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await getPrisma().$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "RateLimit" (
       "key" TEXT PRIMARY KEY,
       "count" INTEGER NOT NULL,
       "reset_at" TIMESTAMPTZ NOT NULL
     )`
  );
  tableReady = true;
}

/**
 * Consume one unit against `key`. Returns whether the request is allowed and
 * how long until the window resets. `key` should already be scoped (e.g.
 * `"ai:<userId>"`) so different features/users don't share a budget.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateResult> {
  if (!databaseConfigured()) return memLimit(key, limit, windowSec);

  try {
    await ensureTable();
    // Atomic fixed window: insert a new window, or increment the current one —
    // resetting count to 1 when the previous window has expired. Done entirely
    // in-DB so concurrent instances can't race past the limit.
    const rows = await getPrisma().$queryRawUnsafe<Array<{ count: number | bigint; reset_at: Date }>>(
      `INSERT INTO "RateLimit" ("key", "count", "reset_at")
         VALUES ($1, 1, now() + ($2::int * interval '1 second'))
       ON CONFLICT ("key") DO UPDATE SET
         "count"    = CASE WHEN "RateLimit"."reset_at" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
         "reset_at" = CASE WHEN "RateLimit"."reset_at" <= now() THEN now() + ($2::int * interval '1 second') ELSE "RateLimit"."reset_at" END
       RETURNING "count", "reset_at"`,
      key,
      windowSec
    );
    const row = rows[0];
    const count = Number(row.count);
    const resetAt = new Date(row.reset_at).getTime();
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSec: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
      limit,
    };
  } catch (err) {
    // Never let the cost guard break the app — allow, but log for visibility.
    console.error("rateLimit error (failing open):", err);
    return { ok: true, remaining: limit, retryAfterSec: windowSec, limit };
  }
}

// Sensible per-user budgets for the money-costing endpoints. Generous enough
// that no real human hits them, tight enough to bound runaway/abusive spend.
export const LIMITS = {
  // AI coach (Groq). No monthly quota: every user gets the coach, bounded by
  // layered rate limits that stop bursts, loops and sustained abuse.
  ai: {
    minute: { limit: 8, windowSec: 60 },
    hour: { limit: 60, windowSec: 3600 },
    day: { limit: 200, windowSec: 86400 },
  },
  plaid: { limit: 40, windowSec: 60 },   // Plaid API calls (accounts/transactions/link)
} as const;

/**
 * Convenience wrapper: rate-limits `key` and, if exceeded, returns a ready-made
 * 429 Response with a Retry-After header. Returns `null` when allowed.
 */
export async function enforceRateLimit(
  key: string,
  { limit, windowSec }: { limit: number; windowSec: number }
): Promise<Response | null> {
  const r = await rateLimit(key, limit, windowSec);
  if (r.ok) return null;
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down and try again shortly.", retryAfterSec: r.retryAfterSec }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(r.retryAfterSec),
      },
    }
  );
}
