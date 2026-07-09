import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Anton } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Display face for the hero tagline (outlined treatment)
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Credo – Personal Finance Command Center",
  description: "Track spending, budgets, investments, and net worth with AI-powered insights.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Credo",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${anton.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
