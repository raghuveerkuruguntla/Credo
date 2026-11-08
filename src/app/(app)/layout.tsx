import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import AnimatedBackground from "@/components/AnimatedBackground";
import SampleDataBanner from "@/components/SampleDataBanner";
import OfflineBanner from "@/components/pwa/OfflineBanner";
import InstallPrompt from "@/components/pwa/InstallPrompt";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // New users must complete onboarding (name + birth date, 18+) first
  const user = await currentUser();
  if (user && !user.publicMetadata?.onboarded) {
    redirect("/onboarding");
  }

  return (
    <div className="dark-app h-dvh bg-[#0a0b0f] flex overflow-hidden relative">
      <AnimatedBackground />
      {/* Primary navigation: a left rail on desktop, bottom tab bar on mobile */}
      <Sidebar />
      <div className="relative z-10 flex flex-col flex-1 min-w-0 h-full">
        <TopNav />
        {/* main is a size container so full-height pages (AI Coach) can use
            100cqh; other pages grow with their content so the footer always
            sits below them instead of behind them. */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden [container-type:size]">
          <div className="max-w-[1400px] mx-auto w-full min-h-full animate-in"><OfflineBanner /><SampleDataBanner /><InstallPrompt />{children}</div>
          {/* Footer scrolls with content; hidden on mobile where the tab bar lives */}
          <div className="hidden lg:block">
            <Footer />
          </div>
        </main>
        <MobileTabBar />
      </div>
    </div>
  );
}
