import Link from "next/link";
import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] shrink-0">
      <div className="max-w-[1400px] mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-md flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-stone-200">Finza</span>
        </Link>

        <nav className="flex items-center gap-6 text-xs text-stone-500">
          <Link href="/" className="hover:text-stone-200 transition-colors">Home</Link>
          <Link href="/terms" className="hover:text-stone-200 transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-stone-200 transition-colors">Privacy Policy</Link>
        </nav>

        <p className="text-[11px] text-stone-600 w-full md:w-auto">
          © {new Date().getFullYear()} Finza. Not financial, legal, tax, or investment advice.
        </p>
      </div>
    </footer>
  );
}
