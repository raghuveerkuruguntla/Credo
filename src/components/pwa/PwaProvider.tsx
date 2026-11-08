"use client";

// Registers the service worker (production, or when NEXT_PUBLIC_ENABLE_SW=1
// for local HTTPS testing) and clears this browser's Credo preferences when
// the user signs out, so nothing about one person's finances stays behind for
// the next person on a shared device.

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

const SW_ENABLED = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_SW === "1";

export default function PwaProvider() {
  useEffect(() => {
    if (!SW_ENABLED || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  const { isLoaded, isSignedIn } = useAuth();
  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith("credo.")) localStorage.removeItem(k);
      for (const k of Object.keys(sessionStorage)) if (k.startsWith("credo.")) sessionStorage.removeItem(k);
    } catch {}
  }, [isLoaded, isSignedIn]);

  return null;
}
