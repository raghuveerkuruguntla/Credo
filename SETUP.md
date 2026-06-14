# FinPilot — Setup Guide

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## 1. Authentication (Clerk)

In **development**, Clerk runs in *keyless mode* — no setup needed. The first time you load the app you'll see a "Claim your keys" prompt in the bottom corner; click it to link the app to a free Clerk account.

For **production**:
1. Create an application at https://dashboard.clerk.com
2. Copy the keys from **API Keys** into `.env.local` (or your host's env vars):
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   ```

Sign-in/sign-up pages live at `/login` and `/signup`. All app pages (`/dashboard`, `/accounts`, etc.) and the Plaid API routes are protected by `src/proxy.ts`.

## 2. Bank connections (Plaid)

1. Create a free account at https://dashboard.plaid.com
2. Go to **Team Settings → Keys** and copy your `client_id` and the **Sandbox** secret
3. Uncomment and fill in `.env.local`:
   ```
   PLAID_CLIENT_ID=...
   PLAID_SECRET=...
   PLAID_ENV=sandbox
   ```
4. Restart the dev server, sign in, and click **Connect Account** on the dashboard or accounts page.

In **sandbox** mode you connect fake banks — use credentials `user_good` / `pass_good` when the Plaid window asks. Connected accounts appear in the "Live Connected Banks" card on the Accounts page.

To connect **real banks**, apply for Production access in the Plaid dashboard (free for first 100 connections), then set `PLAID_ENV=production` and use your production secret.

## 3. Paid plans (Stripe)

1. Create a free account at https://dashboard.stripe.com (or use an existing one)
2. Copy your **test secret key** from https://dashboard.stripe.com/test/apikeys into `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   ```
3. For the webhook (updates the user's plan after payment), run the Stripe CLI in a second terminal during development:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   It prints a `whsec_...` signing secret — put it in `.env.local` as `STRIPE_WEBHOOK_SECRET`.
   (Install the CLI from https://docs.stripe.com/stripe-cli)
4. Restart the dev server, go to **Billing**, and click **Upgrade to Plus**. Use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.

No products need to be created in the Stripe dashboard — checkout sessions use inline prices ($9.99 Plus / $19.99 Pro, defined in `src/lib/stripe.ts`). The user's plan is stored in Clerk user metadata (`publicMetadata.plan`) by the webhook. Subscribers manage/cancel via the Stripe billing portal ("Manage subscription" button).

For **production**: use your live secret key, and create a permanent webhook endpoint at https://dashboard.stripe.com/webhooks pointing to `https://yourdomain.com/api/stripe/webhook` (events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`), then use that endpoint's signing secret. Also enable the billing portal at https://dashboard.stripe.com/settings/billing/portal.

## 4. Database (Neon Postgres + Prisma)

Plaid access tokens are stored in Postgres via Prisma. Without `DATABASE_URL` the app falls back to a local file (`.data/plaid-items.json`) — fine for quick local testing, but required for any real deployment.

1. Create a free project at https://console.neon.tech
2. On the project dashboard, click **Connect** and copy the connection string (it looks like `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`)
3. Put it in `.env.local`:
   ```
   DATABASE_URL=postgresql://...
   ```
4. Push the schema to the database:
   ```bash
   npx prisma db push
   ```
5. Restart the dev server. Plaid connections are now stored in Neon.

The Prisma client uses the Neon serverless driver (`@prisma/adapter-neon`), so it works on Vercel/serverless out of the box.

## 5. AI assistant (Groq)

The AI assistant calls Groq's `llama-3.3-70b-versatile` model, grounded in the user's financial data (live Plaid data when bank accounts are connected, the demo dataset otherwise).

1. Get a free API key at https://console.groq.com/keys
2. Add it to `.env.local`:
   ```
   GROQ_API_KEY=gsk_...
   ```

## 6. Before deploying for real users

- Set `DATABASE_URL` (Neon) — the file fallback does not work on serverless hosts.
- Set all env vars in your hosting provider (Vercel: Project → Settings → Environment Variables): Clerk, Plaid, Stripe, `DATABASE_URL`, `GROQ_API_KEY`.
- Plaid production access requires completing their security questionnaire.
- Rotate any API keys that were shared in chats or committed anywhere.

## Deploy to Vercel

```bash
npx vercel
```

Then add the Clerk + Plaid env vars in the Vercel dashboard and redeploy.
