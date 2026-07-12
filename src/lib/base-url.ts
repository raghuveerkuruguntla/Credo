// Trusted absolute base URL for building redirect targets (Stripe success/return
// URLs). Using the raw client `Origin` header would let a spoofed value point
// the post-checkout redirect at an attacker-controlled host, so we only honour
// known-good origins and otherwise fall back to the canonical production URL.

const ALLOWED = new Set([
  "https://www.finza.dev",
  "https://finza.dev",
  "http://localhost:3000",
]);

// Vercel preview deployments for this project, e.g.
// https://fin-pilot-<hash>-raghu-ks-projects-3dde92c8.vercel.app
const PREVIEW = /^https:\/\/fin-pilot-[a-z0-9-]+\.vercel\.app$/;

export function getBaseUrl(request: Request): string {
  const origin = request.headers.get("origin") ?? "";
  if (ALLOWED.has(origin) || PREVIEW.test(origin)) return origin;
  return (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")) || "https://www.finza.dev";
}
