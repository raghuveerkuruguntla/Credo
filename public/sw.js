/* Credo service worker.
 *
 * Security model (this is a finance app):
 *  - Only public, non-personal files are ever cached: the hashed build assets
 *    under /_next/static, the icons/images in /public, the manifest and the
 *    offline page.
 *  - Pages (HTML navigations), every /api/* response, Clerk auth endpoints,
 *    Plaid and any cross-origin request always go to the network and are never
 *    stored. If a page can't load because the device is offline, the offline
 *    screen is shown instead.
 *  - Nothing with a cookie-dependent or authenticated body is put in Cache Storage.
 */

const VERSION = "credo-v1";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

// Public, non-personal files that are safe to keep.
const PUBLIC_FILE = /\.(?:png|jpe?g|webp|gif|svg|ico|woff2?|ttf)$/i;
function isCacheableStatic(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/_next/static/")) return true; // content-hashed build output
  if (url.pathname === "/manifest.webmanifest") return true;
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/splash/") || url.pathname.startsWith("/logos/")) return true;
  return PUBLIC_FILE.test(url.pathname) && !url.search;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;               // never touch POST (AI chat, Plaid, etc.)
  const url = new URL(request.url);

  // Page loads: network only; offline screen when the network is unavailable.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        return await fetch(request);
      } catch {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(OFFLINE_URL)) || new Response("You're offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  if (!isCacheableStatic(url)) return;                // API, auth, data, third parties: browser default, never cached here

  // Hashed build assets never change: cache first. Other public files: serve
  // from cache and refresh in the background.
  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    const network = fetch(request).then((res) => {
      if (res.ok && res.type === "basic" && !res.headers.get("Set-Cookie")) cache.put(request, res.clone());
      return res;
    }).catch(() => undefined);
    if (cached) {
      if (!url.pathname.startsWith("/_next/static/")) event.waitUntil(network);
      return cached;
    }
    return (await network) || Response.error();
  })());
});

// Lets the page ask a waiting worker to take over (used after an update).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
