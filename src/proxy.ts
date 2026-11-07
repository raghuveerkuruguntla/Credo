import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/health(.*)",
  "/blindspots(.*)",
  "/insights(.*)",
  "/accounts(.*)",
  "/transactions(.*)",
  "/spending(.*)",
  "/budget(.*)",
  "/forecast(.*)",
  "/net-worth(.*)",
  "/investments(.*)",
  "/ai(.*)",
  "/settings(.*)",
  "/onboarding(.*)",
  "/api/onboarding(.*)",
  "/api/settings(.*)",
  "/api/budget(.*)",
  "/api/plaid(.*)",
  "/api/ai(.*)",
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
