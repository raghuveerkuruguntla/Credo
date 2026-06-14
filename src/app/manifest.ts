import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinPilot – Personal Finance Command Center",
    short_name: "FinPilot",
    description: "Track spending, budgets, investments, and net worth with AI-powered insights.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0d0b0a",
    theme_color: "#0d0b0a",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png" },
    ],
  };
}
