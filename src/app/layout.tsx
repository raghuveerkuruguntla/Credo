import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Anton } from "next/font/google";
import "./globals.css";
import PwaProvider from "@/components/pwa/PwaProvider";

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

// iPhone launch screens: [pixel width, pixel height, device pixel ratio].
const SPLASH: [number, number, number][] = [
  [1320, 2868, 3], [1206, 2622, 3], [1290, 2796, 3], [1179, 2556, 3], [1284, 2778, 3], [1170, 2532, 3],
  [1125, 2436, 3], [1080, 2340, 3], [1242, 2688, 3], [828, 1792, 2], [1242, 2208, 3], [750, 1334, 2],
];

export const metadata: Metadata = {
  title: "Credo – Personal Finance Command Center",
  description: "Track spending, budgets, investments, and net worth with AI-powered insights.",
  manifest: "/manifest.webmanifest",
  applicationName: "Credo",
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // iPhone "Add to Home Screen": opens full screen with a dark status bar and
  // a branded launch screen sized for each device.
  appleWebApp: {
    capable: true,
    title: "Credo",
    statusBarStyle: "black",
    startupImage: SPLASH.map(([w, h, r]) => ({
      url: `/splash/splash-${w}x${h}.png`,
      media: `(device-width: ${w / r}px) and (device-height: ${h / r}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
    })),
  },
  formatDetection: { telephone: false },
  other: { "mobile-web-app-capable": "yes" },
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
        <body>
          {children}
          <PwaProvider />
        </body>
      </html>
    </ClerkProvider>
  );
}
