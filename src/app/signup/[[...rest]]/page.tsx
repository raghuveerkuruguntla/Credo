import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Zap, Check, ArrowLeft } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function SignupPage() {
  return (
    <div className="dark-app min-h-screen bg-[#0d0b0a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />
      <Link
        href="/"
        className="absolute top-6 left-6 z-10 flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>
      <div className="relative z-10 flex flex-col items-center animate-in">
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(249,115,22,0.35)]">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-50">Create your account</h1>
          <p className="text-stone-500 text-sm mt-1">Free forever. No credit card needed.</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-5 flex flex-wrap gap-x-4 gap-y-1 max-w-sm justify-center">
          {["2 bank connections", "Basic analytics", "Forecasting", "10 AI questions/mo"].map((f) => (
            <span key={f} className="flex items-center gap-1 text-xs text-orange-300"><Check className="w-3 h-3" />{f}</span>
          ))}
        </div>
        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/login"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
