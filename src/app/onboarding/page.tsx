"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Google sign-ups already have a name from their Google profile
  const needsName = isLoaded && !user?.firstName;

  // Max selectable date = exactly 18 years ago today
  const maxDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().slice(0, 10);
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (needsName && (!firstName.trim() || !lastName.trim())) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!birthDate) {
      setError("Please enter your birth date.");
      return;
    }
    if (birthDate > maxDate) {
      setError("You must be at least 18 years old to use Credo.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(needsName ? { firstName, lastName, birthDate } : { birthDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      await user?.reload(); // pick up the new metadata before entering the app
      router.push("/dashboard");
    } catch {
      setError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div className="dark-app min-h-screen bg-[#0a0b0f] flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />
      <div className="w-full max-w-sm relative z-10 animate-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(99,102,241,0.35)]">
            <span className="text-white font-bold text-xl leading-none">C</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-50">
            {needsName ? "Tell us about yourself" : `Welcome${user?.firstName ? `, ${user.firstName}` : ""}!`}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {needsName
              ? "A few details to set up your account."
              : "One last thing before you get started."}
          </p>
        </div>

        <form onSubmit={submit} className="bg-gradient-to-b from-[#171a21] to-[#0f1117] border border-white/[0.06] rounded-2xl p-6 space-y-4">
          {needsName && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">First name</label>
                <input
                  type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Alex" autoFocus
                  className="w-full border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">Last name</label>
                <input
                  type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Johnson"
                  className="w-full border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Date of birth</label>
            <input
              type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
              max={maxDate} min="1900-01-01"
              className="w-full border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
            <p className="text-xs text-stone-600 mt-1.5">You must be 18 or older to use Credo.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-3.5 py-2.5">
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit" disabled={submitting}
            className="w-full bg-stone-100 text-stone-900 hover:bg-white font-semibold py-2.5 rounded-full transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Continue to dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
