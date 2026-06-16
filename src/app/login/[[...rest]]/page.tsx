import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function LoginPage() {
  return (
    <div className="dark-app min-h-screen bg-[#0a0b0f] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />
      <Link
        href="/"
        className="absolute top-6 left-6 z-10 flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>
      <div className="relative z-10 flex flex-col items-center animate-in">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(99,102,241,0.35)]">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-50">Sign in to Finza</h1>
          <p className="text-stone-500 text-sm mt-1">Your financial command center</p>
        </div>
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/signup"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
