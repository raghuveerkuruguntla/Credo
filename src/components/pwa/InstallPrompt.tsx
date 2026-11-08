"use client";

// "Install Credo" prompt.
//  • Chrome / Edge / Samsung Internet (Android, desktop): uses the browser's
//    beforeinstallprompt event to show a one-tap Install button.
//  • iPhone / iPad Safari: there's no install API, so it shows the two steps
//    (Share → Add to Home Screen).
// Hidden when already running as an installed app, and for 30 days after the
// user dismisses it. `variant="card"` is the always-available version used in
// Settings.

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa.installDismissedAt";
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => { deferred = null; listeners.forEach((l) => l()); });
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function isIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export default function InstallPrompt({ variant = "banner" }: { variant?: "banner" | "card" }) {
  const [state, setState] = useState<{ ready: boolean; installed: boolean; ios: boolean; canPrompt: boolean; dismissed: boolean }>({
    ready: false, installed: false, ios: false, canPrompt: false, dismissed: false,
  });

  useEffect(() => {
    const sync = () => {
      let dismissed = false;
      try { dismissed = Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < SNOOZE_MS; } catch {}
      setState({ ready: true, installed: isStandalone(), ios: isIOS(), canPrompt: deferred != null, dismissed });
    };
    sync();
    listeners.add(sync);
    return () => { listeners.delete(sync); };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null;
    listeners.forEach((l) => l());
  };
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setState((s) => ({ ...s, dismissed: true }));
  };

  if (!state.ready) return null;

  if (variant === "card") {
    return (
      <div className="space-y-3 text-sm">
        {state.installed ? (
          <p className="flex items-center gap-2 text-emerald-300"><Check className="w-4 h-4" /> You&apos;re using the installed Credo app.</p>
        ) : state.canPrompt ? (
          <button onClick={install} className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-white text-[#0a0b0f] font-semibold hover:bg-stone-200">
            <Download className="w-4 h-4" /> Install Credo
          </button>
        ) : state.ios ? (
          <IosSteps />
        ) : (
          <p className="text-stone-400">Open Credo in Chrome or Edge and choose <span className="text-stone-200">Install app</span> from the address bar or browser menu. On iPhone, use Safari&apos;s <span className="text-stone-200">Share → Add to Home Screen</span>.</p>
        )}
        <p className="text-xs text-stone-500">Installed Credo opens full screen from your home screen or dock, with no app store needed. Your data still loads securely from the internet and is never stored on the device.</p>
      </div>
    );
  }

  if (state.installed || state.dismissed || (!state.canPrompt && !state.ios)) return null;

  return (
    <div className={cn("mx-4 sm:mx-6 mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm", !state.canPrompt && "lg:hidden")}>
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-[10px] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-100">Get the Credo app</p>
          {state.canPrompt ? (
            <p className="text-stone-400 text-[13px] mt-0.5">Install it to open full screen from your home screen. No app store needed.</p>
          ) : (
            <IosSteps compact />
          )}
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="-mr-1 -mt-1 w-9 h-9 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-200 hover:bg-white/[0.06] shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
      {state.canPrompt && (
        <button onClick={install} className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-white text-[#0a0b0f] font-semibold hover:bg-stone-200">
          <Download className="w-4 h-4" /> Install
        </button>
      )}
    </div>
  );
}

function IosSteps({ compact = false }: { compact?: boolean }) {
  return (
    <ol className={cn("text-stone-400", compact ? "text-[13px] mt-0.5 space-y-0.5" : "space-y-1.5")}>
      <li className="flex items-center gap-1.5 flex-wrap">1. Tap <Share className="w-4 h-4 text-sky-400 inline" aria-label="Share" /> <span className="text-stone-200">Share</span> in Safari&apos;s toolbar</li>
      <li className="flex items-center gap-1.5 flex-wrap">2. Choose <SquarePlus className="w-4 h-4 text-stone-200 inline" aria-hidden /> <span className="text-stone-200">Add to Home Screen</span>, then <span className="text-stone-200">Add</span></li>
    </ol>
  );
}
