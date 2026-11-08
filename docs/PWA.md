# Credo as an installable app (PWA)

Credo is a Progressive Web App. People install it straight from the browser and
it opens full screen from the home screen, dock or Start menu. It is not
published to the App Store or Google Play.

## What's included

| Piece | Where |
|---|---|
| Web app manifest (name, colours, `standalone`, start URL, shortcuts) | `src/app/manifest.ts` → served at `/manifest.webmanifest` |
| Icons 192 / 512, Android maskable 192 / 512, Apple touch 180 | `public/icons/` |
| iPhone launch screens (12 device sizes) | `public/splash/`, wired up in `src/app/layout.tsx` (`appleWebApp.startupImage`) |
| Service worker | `public/sw.js`, registered by `src/components/pwa/PwaProvider.tsx` |
| Offline screen | `public/offline.html` |
| "Get the app" prompt (Android/desktop install button, iPhone steps) | `src/components/pwa/InstallPrompt.tsx` (top of the app, and Settings → Install the app) |
| Offline notice inside the app | `src/components/pwa/OfflineBanner.tsx` |
| Service-worker headers (no-store, same-origin CSP) | `next.config.ts` |

### What is (and isn't) cached

The service worker only stores **public, non-personal files**: the
content-hashed build assets under `/_next/static`, icons and images in
`/public`, the manifest and the offline page.

It never stores:
- pages (HTML)
- any `/api/*` response (balances, transactions, health data, AI coach)
- Clerk sign-in requests
- Plaid
- POST requests
- anything from another origin

Pages always load from the network. When the device is offline, the offline
screen appears instead. Inside the app, a banner explains that live balances,
bank sync and the AI coach need a connection.

When someone signs out, Credo clears its own browser storage (`credo.*` keys:
dismissed insights, score history, coach hand-off), so nothing stays behind on
a shared device. API keys and secrets are server-side only (`GROQ_API_KEY`,
`PLAID_SECRET`, `CLERK_SECRET_KEY`, `ENCRYPTION_KEY`); none use the
`NEXT_PUBLIC_` prefix.

The service worker is registered in production builds only. To try it in
development, set `NEXT_PUBLIC_ENABLE_SW=1` (see below).

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000 (service worker off)
```

Environment variables are covered in `SETUP.md` (Clerk, Plaid sandbox, Groq).

### Test the installable app on your computer

`localhost` counts as a secure origin, so a production build is enough:

```bash
npm run build
npm start              # http://localhost:3000
```

Open Chrome or Edge, then DevTools → **Application**. The
**Manifest** panel should show no errors, and **Service workers** should show
`sw.js` as activated. Use the **Install** icon in the address bar to install it.
Tick **Offline** in the Network tab and reload a page: you should see the
offline screen.

To test with the dev server over HTTPS:

```bash
NEXT_PUBLIC_ENABLE_SW=1 npm run dev:https     # https://localhost:3000, self-signed cert via mkcert
```

When you're done, unregister the worker in DevTools → Application → Service
workers. That stops it from caching dev assets.

## Test on a physical iPhone or Android phone

Installing an app and registering a service worker both need HTTPS with a
certificate the phone trusts. The self-signed certificate from
`--experimental-https` is only trusted on your computer, so use one of these:

**Option A: Vercel preview (easiest).** Every pull request gets an HTTPS
preview URL, and every merge updates https://www.finza.dev. Open either one on
the phone. Clerk's production keys only work on the production domain. If
sign-in fails on a preview URL, test on finza.dev, or give the preview
environment Clerk development keys.

**Option B: HTTPS tunnel to your computer.** This works with Clerk's
development keys:

```bash
npm run build && npm start                     # or: npm run dev
npx cloudflared tunnel --url http://localhost:3000
# → https://<random>.trycloudflare.com  (open this on the phone)
```

(`ngrok http 3000` works the same way.)

**Option C: Android over USB.** Open `chrome://inspect` on your computer and
turn on **Port forwarding** for `3000 → localhost:3000`. On the phone, open
`http://localhost:3000` in Chrome. It counts as secure, so you can install and
debug it, with remote DevTools available.

`npm run dev:lan` serves https on your local network
(`https://<your-computer-ip>:3000`). Phones will warn about the certificate
unless you install the mkcert root CA on them, so prefer A or B.

## Install it

**iPhone / iPad (Safari)**
1. Open https://www.finza.dev, or your preview/tunnel URL, in **Safari**.
2. Tap **Share** (the square with an arrow) → **Add to Home Screen** → **Add**.
3. Open **Credo** from the home screen. It launches full screen with Credo's
   launch screen and no Safari address bar or toolbar.

On iOS 16.4 and later, Chrome and Edge on iPhone also offer Share → Add to Home Screen.

**Android (Chrome, Edge, Samsung Internet)**
1. Open the site.
2. Tap **Install** on the "Get the Credo app" card, or use the browser menu →
   **Install app** / **Add to Home screen**.
3. Open **Credo** from the home screen or app drawer.

Long-press the icon for shortcuts to Health, Forecast, Coach and Accounts.

**Desktop (Chrome, Edge)**
Click the install icon in the address bar, or the browser menu → **Install
Credo**. It opens in its own window. Safari on macOS uses File → **Add to
Dock**. Credo keeps working as a normal website in any browser.

## Checklist after changes

- DevTools → Application → Manifest: no errors; icons 192, 512 and maskable shown.
- `sw.js` is activated, and Cache Storage `credo-v1-static` contains only `/_next/static/…`, icons, images, the manifest and `offline.html`.
- Going offline shows the offline screen on reload, and the in-app offline banner appears.
- Sign in, dashboard, Financial Health, Insights, Accounts, Forecast & What-if, AI Coach and sample data all work in the installed app.
- Bump `VERSION` in `public/sw.js` when changing what it precaches.
