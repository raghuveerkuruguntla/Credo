"use client";

// Tells the user when the device is offline: live balances, bank sync and the
// AI coach need a connection, and anything on screen may be out of date.

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="mx-4 sm:mx-6 mt-3 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100">
      <WifiOff className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
      <span><span className="font-semibold">You&apos;re offline.</span> Live balances, bank sync and the AI coach need an internet connection. What&apos;s on screen may be out of date.</span>
    </div>
  );
}
