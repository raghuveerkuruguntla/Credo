import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/accounts(.*)",
  "/transactions(.*)",
  "/spending(.*)",
  "/budget(.*)",
  "/forecast(.*)",
  "/net-worth(.*)",
  "/investments(.*)",
  "/ai(.*)",
  "/settings(.*)",
  "/billing(.*)",
  "/onboarding(.*)",
  "/api/onboarding(.*)",
  "/api/settings(.*)",
  "/api/plaid(.*)",
  "/api/ai(.*)",
  "/api/stripe/checkout(.*)",
  "/api/stripe/portal(.*)",
  // NOTE: /api/stripe/webhook is intentionally NOT protected — it is called
  // by Stripe's servers and authenticated via signature verification instead.
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
