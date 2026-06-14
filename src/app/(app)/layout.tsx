import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // New users must complete onboarding (name + birth date, 18+) first
  const user = await currentUser();
  if (user && !user.publicMetadata?.onboarded) {
    redirect("/onboarding");
  }

  return (
    <div className="dark-app h-screen bg-[#0d0b0a] flex flex-col overflow-hidden relative">
      <AnimatedBackground />
      <div className="relative z-10 flex flex-col h-full min-h-0">
        <TopNav />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto w-full h-full animate-in">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
