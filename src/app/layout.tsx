import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinPilot – Personal Finance Command Center",
  description: "Track spending, budgets, investments, and net worth with AI-powered insights.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "FinPilot",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0b0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
