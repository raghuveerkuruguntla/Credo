import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Credo – Personal Finance Command Center",
    short_name: "Credo",
    description: "Track spending, budgets, investments, and net worth with AI-powered insights.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0b0f",
    theme_color: "#0a0b0f",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png" },
    ],
  };
}
