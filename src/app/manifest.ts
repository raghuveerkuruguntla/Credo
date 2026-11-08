import type { MetadataRoute } from "next";

// Web app manifest (served at /manifest.webmanifest). Makes Credo installable
// from Chrome/Edge (Android, desktop) and gives Safari's "Add to Home Screen"
// the name, colours and icons. Splash screens on Android are generated from
// name + background_color + icons; iOS launch images are set in layout.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Credo – Personal Finance Command Center",
    short_name: "Credo",
    description: "Your whole financial picture in one place: health score, insights, forecasts, a what-if simulator and an AI coach.",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#0a0b0f",
    theme_color: "#0a0b0f",
    orientation: "any",
    categories: ["finance", "productivity"],
    lang: "en-US",
    dir: "ltr",
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Financial Health", short_name: "Health", url: "/health", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Forecast & What-if", short_name: "Forecast", url: "/forecast", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "AI Coach", short_name: "Coach", url: "/ai", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Accounts", short_name: "Accounts", url: "/accounts", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
