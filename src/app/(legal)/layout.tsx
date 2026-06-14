import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark-app min-h-screen bg-[#0d0b0a] flex flex-col">
      <header className="border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-[15px] font-bold text-stone-50">FinPilot</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-100 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">{children}</main>

      <footer className="border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-3 text-xs text-stone-500">
          <span>© {new Date().getFullYear()} FinPilot</span>
          <nav className="flex items-center gap-6">
            <Link href="/" className="hover:text-stone-200 transition-colors">Home</Link>
            <Link href="/terms" className="hover:text-stone-200 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-stone-200 transition-colors">Privacy Policy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
