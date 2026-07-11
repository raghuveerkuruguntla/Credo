import Link from "next/link";
import { Shield, Bot, TrendingUp, BarChart3, Wallet, ArrowRight, Check, Sparkles, Star, Globe, Share2, AtSign, Send, Mail, Lock, Gift, Crown, PieChart, Target, ChevronDown } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import LandingNav from "@/components/LandingNav";
import LogoMarquee from "@/components/LogoMarquee";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { HeroReveal, HeroItem } from "@/components/motion/HeroReveal";
import { Counter } from "@/components/motion/Counter";
import { Spotlight } from "@/components/motion/Spotlight";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";

const features = [
  { icon: BarChart3, title: "Unified Dashboard", desc: "Every account, balance, and your full net worth in one clean view." },
  { icon: Wallet, title: "Smart Budgeting", desc: "Set monthly limits per category and track them against real spending." },
  { icon: TrendingUp, title: "Future Forecasting", desc: "Run what-if scenarios to see how today's choices shape tomorrow." },
  { icon: Bot, title: "AI Financial Assistant", desc: "Ask anything about your money — answers grounded in your real data." },
  { icon: Shield, title: "Bank-Level Security", desc: "Read-only Plaid connections, AES-256 encryption, and we never store your bank login." },
  { icon: Sparkles, title: "Investment Tracking", desc: "Track your investment accounts, balances, and allocation in one view." },
];

// Liquid-glass surface (Higgsfield render) mapped as one continuous image across
// the 3x2 feature grid, so each card shows a different facet of the same flowing
// glass — refractive folds and glossy highlights that the pure-CSS bevel can't
// fake. This is the base material layer; a darkening scrim above it keeps the copy
// readable, and a faint silk light streak flows over the top.
function CardGlass({ index }: { index: number }) {
  const col = index % 3, row = Math.floor(index / 3);
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[26px]"
      style={{
        backgroundImage: "url('/features-glass.webp')",
        backgroundSize: "300% 210%",
        backgroundPosition: `${col * 50}% ${row * 100}%`,
        backgroundRepeat: "no-repeat",
        opacity: 0.5,
      }}
    />
  );
}

// Faint flowing violet silk light streak (Higgsfield render) screen-blended over the
// glass so light appears to catch and travel across the refractive surface.
const ribbonOpacity = [0.12, 0.40, 0.24, 0.34, 0.10, 0.28];

function CardRibbon({ index }: { index: number }) {
  const col = index % 3, row = Math.floor(index / 3);
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[26px]"
      style={{
        backgroundImage: "url('/features-ribbon.webp')",
        backgroundSize: "300% 210%",
        backgroundPosition: `${col * 50}% ${row * 100}%`,
        backgroundRepeat: "no-repeat",
        mixBlendMode: "screen",
        opacity: ribbonOpacity[index],
      }}
    />
  );
}

const tiers = [
  { name: "Free",  icon: Gift,  price: "$0",    note: "forever", features: ["2 institutions","Dashboard & net worth","This/last month spending","10 AI questions/mo"],                     cta: "Get started",    highlight: false },
  { name: "Plus",  icon: Star,  price: "$9.99", note: "/mo",     features: ["5 institutions","Advanced analytics","Forecasting","AI budget suggestions","50 AI questions/mo"],              cta: "Start with Plus",highlight: true  },
  { name: "Pro",   icon: Crown, price: "$19.99",note: "/mo",     features: ["Unlimited institutions","Investment analytics","Data export (CSV)","Unlimited AI questions","Priority support"],cta: "Go Pro",         highlight: false },
];

// Circle-grid geometry for the hero. Banks sit on integer grid cells (i,j)
// measured from the centre; empty cells render as glowing rings. Large rings
// on a tight pitch read as a faint futuristic grid; only the centre 3x3 glows.
const RING = 268;   // circle diameter, px
const PITCH = 292;  // centre-to-centre spacing, px
const COLS = 9;     // grid columns (i = -4..4)
const ROWS = 7;     // grid rows    (j = -3..3)

type Bank = { i:number; j:number; key:string };
const banks: Bank[] = [
  { i:-1, j:-1, key:"chase"      },
  { i: 0, j:-1, key:"wells"      },
  { i: 1, j:-1, key:"bofa"       },
  { i:-1, j: 0, key:"pnc"        },
  { i: 1, j: 0, key:"capitalone" },
  { i:-1, j: 1, key:"amex"       },
  { i: 0, j: 1, key:"truist"     },
  { i: 1, j: 1, key:"citi"       },
];

const LOGO_FILE: Record<string,string> = {
  chase:      "Chase_Logo.png",
  wells:      "Wells_Fargo.png",
  bofa:       "BOFA.png",
  pnc:        "PNC.png",
  capitalone: "CAPITALONE.png",
  amex:       "AMEX.png",
  truist:     "TRUIST.png",
  citi:       "CITI.png",
};
// Per-logo treatment. "white" recolours the solid full-colour logo to a solid
// white fill (brightness(0) makes it black, invert(1) flips it to white) so it
// reads cleanly on black — unlike the "mono" assets which are hollow outlines.
// "color" keeps the original solid colour (red/blue box logos pop as-is).
const LOGO_TREATMENT: Record<string,"white"|"color"> = {
  chase: "white", wells: "color", bofa: "white", pnc: "white",
  capitalone: "white", amex: "color", truist: "white", citi: "white",
};
const bankCells = new Set(banks.map(b => `${b.i},${b.j}`));

// Logo floats directly inside its glowing circle — no card, no white plate.
function BankMark({ k }:{ k:string }) {
  const file = LOGO_FILE[k];
  if (!file) return null;
  const treatment = LOGO_TREATMENT[k] ?? "white";
  const shadow = "drop-shadow(0 1px 6px rgba(0,0,0,0.55))";
  return (
    <span className="flex items-center justify-center" style={{ width: 132, height: 60 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/logos/cut/${file}`}
        alt=""
        loading="lazy"
        decoding="async"
        className="object-contain"
        style={{
          maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto",
          filter: treatment === "white" ? `brightness(0) invert(1) ${shadow}` : shadow,
        }}
      />
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="dark-app relative min-h-screen bg-black text-slate-200 overflow-x-clip">
      <AnimatedBackground />
      <div className="relative z-10">

        {/* NAVBAR — scroll-aware backdrop, reading-progress bar, mobile sheet */}
        <LandingNav />

        {/* SECTION 1: TAKE CONTROL — pulled up under the sticky navbar so the circle grid fills behind it */}
        <section className="relative -mt-16 min-h-screen flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#000000" }}>
          {/* true-black base — no ambient glow; all light comes from the circle rings */}
          <div className="pointer-events-none absolute inset-0" style={{ background: "#000000" }} />

          {/* mobile-only ambient aurora — the desktop circle grid is hidden < md, so
              give small screens a living glow instead of bare black */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden md:hidden">
            <div className="aurora-blob absolute rounded-full" style={{
              width: "70vw", height: "70vw", top: "8%", left: "-10%",
              background: "radial-gradient(circle, rgba(124,92,224,0.30) 0%, transparent 70%)",
              filter: "blur(20px)",
            }} />
            <div className="aurora-blob absolute rounded-full" style={{
              width: "60vw", height: "60vw", top: "30%", right: "-15%", animationDelay: "-9s",
              background: "radial-gradient(circle, rgba(99,102,241,0.26) 0%, transparent 70%)",
              filter: "blur(20px)",
            }} />
          </div>

          {/* circle grid + bank logos — large, thin, soft; centre 3x3 glows, edges fade to black */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden hidden md:block">
            {/* empty glowing rings */}
            {Array.from({ length: COLS * ROWS }).map((_, idx) => {
              const i = (idx % COLS) - (COLS - 1) / 2;
              const j = Math.floor(idx / COLS) - (ROWS - 1) / 2;
              if (bankCells.has(`${i},${j}`)) return null;
              const dist = Math.hypot(i, j);
              const op = Math.max(0.14, 0.95 - dist * 0.26);
              return (
                <div key={idx} className="absolute rounded-full" style={{
                  width: RING, height: RING,
                  left: `calc(50% + ${i * PITCH}px)`, top: `calc(50% + ${j * PITCH}px)`,
                  transform: "translate(-50%,-50%)",
                  border: `1px solid rgba(178,162,255,${op * 0.9})`,
                  boxShadow: `0 0 ${op * 44}px rgba(140,108,236,${op * 0.4}),inset 0 0 ${op * 30}px rgba(120,92,220,${op * 0.08})`,
                  background: "#000000",
                }} />
              );
            })}
            {/* bank-logo circles — logos float directly inside, no card */}
            {banks.map(b => {
              const op = Math.max(0.5, 0.92 - Math.hypot(b.i, b.j) * 0.30);
              return (
                <div key={b.key} className="absolute rounded-full flex items-center justify-center" style={{
                  width: RING, height: RING,
                  left: `calc(50% + ${b.i * PITCH}px)`, top: `calc(50% + ${b.j * PITCH}px)`,
                  transform: "translate(-50%,-50%)",
                  border: `1px solid rgba(196,182,255,${op})`,
                  boxShadow: `0 0 ${op * 54}px rgba(150,116,244,${op * 0.55}),inset 0 0 ${op * 34}px rgba(120,92,220,${op * 0.1})`,
                  background: "#000000",
                }}>
                  <BankMark k={b.key} />
                </div>
              );
            })}
          </div>

          {/* bottom fade — dissolves the lowest circles into pure black so the hero blends seamlessly into the features section */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[32%] z-[1]" style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.85) 70%, #000000 100%)",
          }} />

          {/* heavy edge vignette — pure black, so outer rings fade out into true black */}
          <div className="pointer-events-none absolute inset-0" style={{
            background: "radial-gradient(ellipse 95% 92% at 50% 50%, transparent 48%, rgba(0,0,0,0.45) 82%, rgba(0,0,0,0.92) 100%)",
          }} />

          {/* hero copy — no card; a soft dark scrim behind keeps text readable over the grid */}
          <div className="relative z-10 text-center px-6 w-full max-w-4xl mx-auto">
            {/* soft radial scrim for legibility (no visible box edges) */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10" style={{
              width: "150%", height: "175%",
              background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(4,3,8,0.85) 0%, rgba(4,3,8,0.6) 42%, transparent 72%)",
              filter: "blur(8px)",
            }} />
            <HeroReveal className="px-2 sm:px-6 py-10">
              <HeroItem>
                <span className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.14em]" style={{
                  color: "rgba(208,198,255,0.92)",
                  background: "rgba(12,10,22,0.55)",
                  border: "1px solid rgba(184,170,255,0.24)",
                  boxShadow: "0 0 22px rgba(140,110,240,0.2)",
                }}>
                  <Sparkles className="w-3 h-3" style={{ color: "#C9BEFF" }} />
                  ALL YOUR MONEY, ONE PLACE
                </span>
              </HeroItem>
              <HeroItem as="h1">
                <span className="block leading-[1.06] tracking-[0.01em] mb-5 text-[2rem] sm:text-[3.6rem] whitespace-nowrap" style={{
                  fontFamily: "var(--font-display)",
                  color: "transparent",
                  WebkitTextStrokeWidth: "1px",
                  WebkitTextStrokeColor: "rgba(240,238,250,0.98)",
                  textShadow: "0 1px 3px rgba(0,0,0,0.55), 0 0 26px rgba(124,92,224,0.30)",
                }}>
                  Control your Finances
                </span>
              </HeroItem>
              <HeroItem as="p">
                <span className="block text-[14px] sm:text-[16px] mb-8 leading-relaxed mx-auto max-w-[22rem]" style={{ color: "rgba(206,204,224,0.88)", textShadow: "0 1px 10px rgba(0,0,0,0.8)" }}>Every account in one place — with AI that actually gets your money.</span>
              </HeroItem>
              <HeroItem className="flex items-center justify-center">
                <Link href="/signup" className="group inline-flex items-center justify-center gap-2 font-semibold px-9 py-3.5 rounded-full transition-all text-[15px] w-full sm:w-auto text-white hover:-translate-y-0.5" style={{
                  background: "linear-gradient(90deg,#6366F1,#8B5CF6)",
                  boxShadow: "0 0 36px rgba(124,92,224,0.55), inset 0 1px 0 rgba(255,255,255,0.22)",
                }}>
                  Get Started
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </HeroItem>
              <HeroItem className="mt-7 flex items-center justify-center gap-2 text-[12px]" >
                <span className="inline-flex items-center gap-2" style={{ color: "rgba(180,176,204,0.78)" }}>
                  <Shield className="w-3.5 h-3.5" style={{ color: "#A99CFF" }} />
                  Encrypted &amp; read-only · No credit card to start
                </span>
              </HeroItem>
            </HeroReveal>
          </div>
        </section>

        {/* SECTION 1.5: TRUST — partner-bank marquee + honest product stats */}
        <section className="relative pt-4 pb-14 sm:pb-20">
          <div className="max-w-5xl mx-auto px-6">
            <Reveal className="text-center mb-8">
              <p className="text-[12px] sm:text-[13px] font-medium tracking-[0.16em] uppercase" style={{ color: "rgba(170,164,200,0.7)" }}>
                Securely connects with 11,000+ banks &amp; institutions
              </p>
            </Reveal>
          </div>
          <Reveal y={16}>
            <LogoMarquee />
          </Reveal>
          <div className="max-w-5xl mx-auto px-6">
            <Stagger className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden" >
              {[
                { node: <Counter to={11000} suffix="+" />, label: "Institutions supported" },
                { node: <>AES-256</>, label: "Token encryption" },
                { node: <>Read-only</>, label: "Bank connections" },
                { node: <>$0</>, label: "To get started" },
              ].map((s, i) => (
                <StaggerItem key={i} className="flex flex-col items-center justify-center text-center px-4 py-7" style={{ background: "rgba(14,12,26,0.5)", boxShadow: "inset 0 0 0 1px rgba(184,170,255,0.08)" }}>
                  <div className="text-2xl sm:text-[2rem] font-bold text-white tracking-tight">{s.node}</div>
                  <div className="mt-1.5 text-[12px] sm:text-[13px]" style={{ color: "rgba(176,172,200,0.82)" }}>{s.label}</div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* SECTION 2: FEATURES — true black; smoked-glass cards with localized violet light ribbons */}
        <section id="features" className="relative py-16 sm:py-20">
          <div className="max-w-[1370px] mx-auto px-6">
            <Reveal className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.18em]" style={{
                color: "rgba(208,198,255,0.9)",
                background: "rgba(12,10,22,0.6)",
                border: "1px solid rgba(184,170,255,0.22)",
                boxShadow: "0 0 22px rgba(140,110,240,0.18)",
              }}>
                <Sparkles className="w-3 h-3" style={{ color: "#C9BEFF" }} />
                ALL-IN-ONE FINANCE
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-[3.25rem] lg:whitespace-nowrap font-bold tracking-[-0.02em] leading-[1.06] mb-4 text-balance" style={{ color: "#DCD8E6", textShadow: "0 0 50px rgba(120,92,220,0.18)" }}>Everything you need to master your money</h2>
              <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto">One calm, secure place for every account, decision, and dollar.</p>
            </Reveal>
            <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-[28px] gap-y-[22px]">
              {features.map(({ icon:Icon, title, desc }, i)=>{
                return (
                  <StaggerItem key={title} className="h-full">
                  <Spotlight className="h-full">
                  <div className="group relative h-full rounded-[26px] p-7 overflow-hidden transition-transform duration-300 hover:-translate-y-1.5" style={{
                    minHeight: "228px",
                    background: "linear-gradient(160deg, rgba(48,42,70,0.50) 0%, rgba(24,21,38,0.42) 46%, rgba(18,16,28,0.48) 100%)",
                    backdropFilter: "blur(28px) saturate(165%) brightness(1.08)",
                    WebkitBackdropFilter: "blur(28px) saturate(165%) brightness(1.08)",
                    boxShadow: [
                      "inset 0 1.5px 0 rgba(255,255,255,0.40)",        // bright crisp top edge
                      "inset 1.5px 0 0 rgba(255,255,255,0.16)",        // soft left edge
                      "inset -1.5px -1.5px 0 rgba(176,148,255,0.34)",  // bottom-right purple rim
                      "inset 0 -34px 64px rgba(0,0,0,0.34)",           // bottom depth
                      "inset 0 40px 70px rgba(196,172,255,0.10)",      // inner lavender top-glow
                      "0 0 0 1px rgba(186,164,250,0.34)",              // crisp lavender outline
                      "0 28px 60px rgba(0,0,0,0.52)",                  // soft black drop
                      "0 0 56px rgba(132,98,232,0.26)",                // purple ambient halo
                    ].join(","),
                  }}>
                    {/* liquid-glass material surface (Higgsfield render, per-card facet) — base layer */}
                    <CardGlass index={i} />
                    {/* darkening scrim over the glass — calms the bright violet and keeps the copy readable */}
                    <div className="pointer-events-none absolute inset-0 rounded-[26px]" style={{
                      background: "linear-gradient(160deg, rgba(12,10,20,0.55) 0%, rgba(10,8,18,0.70) 100%)",
                    }} />
                    {/* faint flowing silk light over the glass (Higgsfield render, per-card segment) */}
                    <CardRibbon index={i} />
                    {/* soft scrim behind the copy column — keeps text crisp on the left, leaves the right side glowing */}
                    <div className="pointer-events-none absolute inset-0 rounded-[26px]" style={{
                      background: "linear-gradient(to right, rgba(10,8,18,0.66) 0%, rgba(10,8,18,0.34) 42%, transparent 72%)",
                    }} />
                    {/* luminous gradient rim — a bright glass bevel that catches light all around, brightest top + corners */}
                    <div className="pointer-events-none absolute inset-0 rounded-[26px]" style={{
                      padding: "1.25px",
                      background: "linear-gradient(135deg, rgba(248,244,255,0.92) 0%, rgba(178,158,242,0.30) 30%, rgba(255,255,255,0.10) 55%, rgba(196,168,255,0.70) 100%)",
                      WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                    }} />
                    {/* bright top-edge hairline — the highlight that runs the full width of the glass */}
                    <div className="pointer-events-none absolute inset-x-5 top-0 h-px" style={{
                      background: "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                    }} />
                    {/* glossy top sheen — light pooling on the upper portion of the glass */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-3/5 rounded-t-[26px]" style={{
                      background: "linear-gradient(to bottom, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 26%, transparent 62%)",
                    }} />
                    {/* top-left specular glint — kept subtle so it doesn't wash out the icon */}
                    <div className="pointer-events-none absolute -top-12 -left-12 w-48 h-32" style={{
                      background: "radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, transparent 70%)",
                    }} />
                    <div className="relative z-10">
                      <div className="w-[56px] h-[56px] rounded-[16px] flex items-center justify-center mb-5" style={{
                        background: "linear-gradient(150deg, rgba(126,94,228,0.46), rgba(80,60,180,0.20))",
                        border: "1px solid rgba(190,176,255,0.40)",
                        boxShadow: "0 0 30px rgba(132,102,238,0.38), inset 0 1px 0 rgba(255,255,255,0.14)",
                      }}>
                        <Icon className="w-6 h-6" style={{ color: "#CDC2FF" }} />
                      </div>
                      <h3 className="font-bold text-white text-[1.3rem] tracking-[-0.015em] mb-2">{title}</h3>
                      <p className="text-[0.9375rem] leading-[1.45]" style={{ color: "rgba(180,174,204,0.92)" }}>{desc}</p>
                    </div>
                  </div>
                  </Spotlight>
                  </StaggerItem>
                );
              })}
            </Stagger>
            <Reveal className="mt-7 text-center">
              <span className="inline-flex items-center gap-2 h-11 text-[15px] text-slate-300 px-7 rounded-full" style={{ background: "rgba(12,10,22,0.6)", border: "1px solid rgba(184,170,255,0.20)", boxShadow: "0 0 22px rgba(124,92,224,0.16)" }}>
                <Lock className="w-3.5 h-3.5" style={{ color: "#C9BEFF" }} />
                Secure. Private. Built for you.
              </span>
            </Reveal>
          </div>
        </section>

        {/* SECTION 3: PHONES — seamless continuation of the features section; 3D render (Higgsfield) */}
        <section className="relative pt-10 sm:pt-14 pb-20 sm:pb-28 overflow-hidden">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal className="text-center mb-12">
              <h2 className="text-4xl sm:text-5xl lg:text-[3.2rem] font-bold tracking-[-0.02em] leading-[1.05] mb-4 text-balance" style={{ color: "#E6E3F0", textShadow: "0 0 60px rgba(120,92,220,0.22)" }}>Your finances, beautifully organized</h2>
              <p className="text-slate-400 text-base sm:text-lg max-w-lg mx-auto">Track balances, spending, budgets, and forecasts in one app.</p>
            </Reveal>
            <Reveal y={32} className="relative mx-auto max-w-3xl">
              {/* soft ambient glow behind the render — shows through the video's black via screen blend */}
              <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(ellipse 62% 54% at 50% 50%, rgba(124,92,224,0.22) 0%, rgba(120,92,220,0.10) 38%, transparent 72%)" }} />
              <video
                src="/phones-demo.mp4"
                poster="/phones-3d.webp"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label="The Credo app shown on three phones — bank balance, spending & budget, and forecasting screens"
                className="w-full h-auto select-none"
                draggable={false}
                style={{
                  // black background of the clip drops out, revealing the page glow + drifting dots
                  mixBlendMode: "screen",
                  // feather the rectangular frame + cut-off side phones into the page so there's no hard edge
                  WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 9%, #000 93%, transparent 100%)",
                  WebkitMaskComposite: "source-in",
                  maskImage: "linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 9%, #000 93%, transparent 100%)",
                  maskComposite: "intersect",
                }}
              />
            </Reveal>
          </div>
        </section>

        {/* SECTION 4: PRICING — liquid-glass cards; the highlighted plan carries the flowing silk light */}
        <section id="pricing" className="py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal className="text-center mb-14">
              <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.18em]" style={{
                color: "rgba(208,198,255,0.9)",
                background: "rgba(12,10,22,0.6)",
                border: "1px solid rgba(184,170,255,0.22)",
                boxShadow: "0 0 22px rgba(140,110,240,0.18)",
              }}>
                <Star className="w-3 h-3" style={{ color: "#C9BEFF" }} />
                SIMPLE, TRANSPARENT PRICING
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4 text-balance">Choose the plan that fits you</h2>
              <p className="text-slate-400">Start free. Upgrade only when you need more.</p>
            </Reveal>
            <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-md md:max-w-none mx-auto md:items-center">
              {tiers.map(({ name, icon:TierIcon, price, note, features:feats, cta, highlight })=>(
                <StaggerItem key={name} className={"relative " + (highlight ? "md:-translate-y-2 z-10" : "")}>
                  {/* "Most popular" badge — sits in this non-clipping wrapper so it overflows the card edge */}
                  {highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30">
                      <span className="inline-flex items-center gap-1.5 text-white text-xs font-bold px-3.5 py-1 rounded-full whitespace-nowrap" style={{
                        background: "linear-gradient(90deg,#6366F1,#8B5CF6)",
                        boxShadow: "0 0 22px rgba(99,102,241,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
                      }}>
                        <Star className="w-3 h-3" /> Most popular
                      </span>
                    </div>
                  )}
                  <div className={"group relative rounded-[26px] p-7 overflow-hidden transition-all duration-300 " + (highlight ? "md:py-9" : "")} style={{
                  background: highlight
                    ? "linear-gradient(160deg, rgba(54,47,82,0.42) 0%, rgba(20,17,32,0.48) 100%)"
                    : "linear-gradient(160deg, rgba(44,39,60,0.38) 0%, rgba(15,13,24,0.46) 100%)",
                  backdropFilter: "blur(26px) saturate(150%) brightness(1.07)",
                  WebkitBackdropFilter: "blur(26px) saturate(150%) brightness(1.07)",
                  boxShadow: [
                    "inset 0 2px 0 rgba(255,255,255,0.55)",          // bright thick top edge
                    "inset 2px 0 0 rgba(255,255,255,0.22)",          // left edge
                    "inset -2px -2px 0 rgba(190,160,255,0.42)",      // bottom-right purple rim
                    "inset 0 0 60px rgba(192,170,255,0.10)",         // overall frosted inner glow
                    "inset 0 44px 72px rgba(200,178,255,0.10)",      // top frosted highlight
                    "inset 0 -36px 64px rgba(0,0,0,0.30)",           // bottom depth
                    highlight ? "0 0 0 1.5px rgba(190,164,255,0.70)" : "0 0 0 1px rgba(198,178,255,0.34)",
                    "0 28px 60px rgba(0,0,0,0.52)",
                    highlight ? "0 0 90px rgba(124,92,224,0.42)" : "0 0 52px rgba(132,98,232,0.18)",
                  ].join(","),
                }}>
                  {/* highlighted plan: a single silky light streak that curves down the right side and bleeds off the right edge */}
                  {highlight && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/pricing-light.webp"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="pointer-events-none absolute top-1/2 -translate-y-1/2 select-none"
                        style={{
                          right: "-26%",
                          height: "128%",
                          width: "auto",
                          mixBlendMode: "screen",
                          opacity: 0.82,
                          filter: "blur(0.8px) saturate(115%)",
                        }}
                      />
                      {/* frosted veil over the streak — the glass haze diffuses the light so it reads as under glass */}
                      <div className="pointer-events-none absolute inset-0 rounded-[26px]" style={{
                        background: "radial-gradient(120% 100% at 100% 50%, rgba(198,180,255,0.12) 0%, transparent 52%)",
                        backdropFilter: "blur(1px)",
                        WebkitBackdropFilter: "blur(1px)",
                        WebkitMaskImage: "radial-gradient(120% 100% at 100% 50%, #000 0%, transparent 60%)",
                        maskImage: "radial-gradient(120% 100% at 100% 50%, #000 0%, transparent 60%)",
                      }} />
                      {/* legibility scrim — darkens the left where the copy sits, lets the right glow */}
                      <div className="pointer-events-none absolute inset-0 rounded-[26px]" style={{
                        background: "linear-gradient(to right, rgba(10,8,18,0.78) 0%, rgba(10,8,18,0.40) 46%, rgba(10,8,18,0.05) 74%, transparent 100%)",
                      }} />
                    </>
                  )}
                  {/* luminous gradient rim — bright thick glass bevel */}
                  <div className="pointer-events-none absolute inset-0 rounded-[26px]" style={{
                    padding: "1.75px",
                    background: highlight
                      ? "linear-gradient(135deg, rgba(255,253,255,1) 0%, rgba(202,182,255,0.55) 28%, rgba(255,255,255,0.20) 52%, rgba(208,182,255,0.90) 100%)"
                      : "linear-gradient(135deg, rgba(252,250,255,0.98) 0%, rgba(190,170,250,0.42) 30%, rgba(255,255,255,0.16) 54%, rgba(206,182,255,0.82) 100%)",
                    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                  }} />
                  {/* glossy top sheen — frosted light pooling on the upper glass */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[26px]" style={{
                    background: "linear-gradient(to bottom, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 24%, transparent 60%)",
                  }} />

                  <div className="relative z-10">
                    <div className="w-[56px] h-[56px] rounded-[16px] flex items-center justify-center mb-5" style={{
                      background: "linear-gradient(150deg, rgba(126,94,228,0.46), rgba(80,60,180,0.20))",
                      border: "1px solid rgba(190,176,255,0.40)",
                      boxShadow: "0 0 30px rgba(132,102,238,0.38), inset 0 1px 0 rgba(255,255,255,0.14)",
                    }}>
                      <TierIcon className="w-6 h-6" style={{ color: "#CDC2FF" }} />
                    </div>
                    <h3 className="font-bold text-2xl text-white mb-1.5">{name}</h3>
                    <div className="flex items-baseline gap-1.5 mb-6">
                      <span className="text-[2.75rem] leading-none font-bold text-white tracking-tight">{price}</span>
                      <span className="text-slate-400 text-sm">{note}</span>
                    </div>
                    <ul className="space-y-3 mb-7">
                      {feats.map(f=>(
                        <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(208,204,224,0.92)" }}>
                          <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-300" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link href="/signup" className={"block text-center py-3.5 rounded-full text-sm font-bold transition-all " + (highlight ? "text-white hover:brightness-110" : "text-slate-100 hover:bg-white/[0.1]")} style={highlight ? {
                      background: "linear-gradient(90deg,#6366F1,#8B5CF6)",
                      boxShadow: "0 0 28px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.22)",
                    } : {
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                    }}>
                      {cta}
                    </Link>
                  </div>
                </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* SECTION 4.5: TESTIMONIALS — glass quote cards, masonry columns */}
        <section className="relative py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.18em]" style={{
                color: "rgba(208,198,255,0.9)",
                background: "rgba(12,10,22,0.6)",
                border: "1px solid rgba(184,170,255,0.22)",
                boxShadow: "0 0 22px rgba(140,110,240,0.18)",
              }}>
                <Star className="w-3 h-3" style={{ color: "#C9BEFF" }} />
                LOVED BY EARLY MEMBERS
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4 text-balance">People who took control of their money</h2>
              <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto">Real reasons members switched to one calm, secure place for everything.</p>
            </Reveal>
            <Testimonials />
          </div>
        </section>

        {/* SECTION 4.6: FAQ — glass accordion */}
        <section id="faq" className="relative py-16 sm:py-24">
          <div className="max-w-3xl mx-auto px-6">
            <Reveal className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.18em]" style={{
                color: "rgba(208,198,255,0.9)",
                background: "rgba(12,10,22,0.6)",
                border: "1px solid rgba(184,170,255,0.22)",
                boxShadow: "0 0 22px rgba(140,110,240,0.18)",
              }}>
                <Sparkles className="w-3 h-3" style={{ color: "#C9BEFF" }} />
                QUESTIONS, ANSWERED
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4 text-balance">Everything you might be wondering</h2>
              <p className="text-slate-400 text-base sm:text-lg max-w-lg mx-auto">Still curious? <a href="#" className="text-indigo-300 hover:text-indigo-200 underline underline-offset-4 transition-colors">Talk to our team</a>.</p>
            </Reveal>
            <Reveal y={16}>
              <FAQ />
            </Reveal>
          </div>
        </section>

        {/* SECTION 5: JOIN & TRACK — one large aurora-glass CTA panel with flowing violet light and floating bubbles */}
        <section className="relative py-20 sm:py-28 px-6">
          <Reveal y={32} className="max-w-5xl mx-auto">
            <div className="relative rounded-[40px] overflow-hidden px-6 sm:px-14 py-14 sm:py-16 text-center" style={{
              background: "linear-gradient(160deg, rgba(40,34,64,0.55) 0%, rgba(16,13,28,0.55) 50%, rgba(12,10,22,0.60) 100%)",
              backdropFilter: "blur(30px) saturate(160%) brightness(1.06)",
              WebkitBackdropFilter: "blur(30px) saturate(160%) brightness(1.06)",
              boxShadow: [
                "inset 0 2px 0 rgba(255,255,255,0.40)",          // bright top edge
                "inset 2px 0 0 rgba(255,255,255,0.14)",          // soft left edge
                "inset -2px -2px 0 rgba(190,160,255,0.34)",      // bottom-right purple rim
                "inset 0 0 90px rgba(150,120,255,0.10)",         // overall inner glow
                "inset 0 -44px 80px rgba(0,0,0,0.34)",           // bottom depth
                "0 0 0 1px rgba(196,178,255,0.34)",              // crisp lavender outline
                "0 40px 100px rgba(0,0,0,0.6)",                  // soft black drop
                "0 0 110px rgba(124,92,224,0.30)",               // purple ambient halo
              ].join(","),
            }}>
              {/* aurora ambient glow base */}
              <div className="pointer-events-none absolute inset-0" style={{
                backgroundImage: "url('/hero-bg.webp')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.85,
              }} />
              {/* flowing violet silk light — right side, bleeds off the edge (Higgsfield render) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pricing-light.webp" alt="" loading="lazy" decoding="async" className="pointer-events-none absolute top-1/2 -translate-y-1/2 select-none" style={{
                right: "-10%", height: "155%", width: "auto", mixBlendMode: "screen", opacity: 0.82, filter: "blur(0.6px) saturate(115%)",
              }} />
              {/* fainter mirrored streak — left side */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pricing-light.webp" alt="" loading="lazy" decoding="async" className="pointer-events-none absolute top-1/2 select-none" style={{
                left: "-18%", height: "155%", width: "auto", transform: "translateY(-50%) scaleX(-1)", mixBlendMode: "screen", opacity: 0.42, filter: "blur(1.2px) saturate(110%)",
              }} />
              {/* floating glass bubbles */}
              {[
                { d: 118, top: "12%", left: "9%",  o: 0.55 },
                { d: 60,  top: "40%", left: "24%", o: 0.42 },
                { d: 150, top: "16%", left: "88%", o: 0.5 },
                { d: 70,  top: "30%", left: "78%", o: 0.4 },
                { d: 40,  top: "78%", left: "13%", o: 0.38 },
              ].map((b, i) => (
                <span key={i} className="pointer-events-none absolute rounded-full" style={{
                  width: b.d, height: b.d, top: b.top, left: b.left, transform: "translate(-50%,-50%)",
                  background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.20) 0%, rgba(170,140,255,0.07) 40%, transparent 70%)",
                  border: "1px solid rgba(200,184,255,0.20)",
                  boxShadow: `inset 0 0 ${b.d/3}px rgba(180,150,255,0.12), 0 0 ${b.d/4}px rgba(140,110,240,0.14)`,
                  opacity: b.o,
                }} />
              ))}
              {/* legibility scrim — keeps the centred copy crisp while the edges glow */}
              <div className="pointer-events-none absolute inset-0 rounded-[40px]" style={{
                background: "radial-gradient(ellipse 68% 78% at 50% 48%, rgba(10,8,18,0.74) 0%, rgba(10,8,18,0.42) 48%, transparent 80%)",
              }} />
              {/* luminous gradient rim */}
              <div className="pointer-events-none absolute inset-0 rounded-[40px]" style={{
                padding: "1.75px",
                background: "linear-gradient(135deg, rgba(252,250,255,0.95) 0%, rgba(196,176,255,0.42) 30%, rgba(255,255,255,0.14) 56%, rgba(206,182,255,0.82) 100%)",
                WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMaskComposite: "xor", maskComposite: "exclude",
              }} />
              {/* glossy top sheen */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-2/5 rounded-t-[40px]" style={{
                background: "linear-gradient(to bottom, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 30%, transparent 65%)",
              }} />

              {/* content */}
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{
                  background: "linear-gradient(150deg, rgba(126,94,228,0.5), rgba(80,60,180,0.22))",
                  border: "1px solid rgba(190,176,255,0.42)",
                  boxShadow: "0 0 34px rgba(132,102,238,0.45), inset 0 1px 0 rgba(255,255,255,0.16)",
                }}>
                  <TrendingUp className="w-8 h-8" style={{ color: "#CFC4FF" }} />
                </div>
                <div className="inline-flex items-center gap-2.5 mb-6 px-4 py-1.5 rounded-full text-[12px] font-medium tracking-wide" style={{
                  color: "rgba(214,206,255,0.92)", background: "rgba(14,11,26,0.5)",
                  border: "1px solid rgba(190,176,255,0.26)", boxShadow: "0 0 22px rgba(140,110,240,0.18)",
                }}>
                  <Sparkles className="w-3 h-3" style={{ color: "#C9BEFF" }} /> Take Control. Build Freedom. <Sparkles className="w-3 h-3" style={{ color: "#C9BEFF" }} />
                </div>
                <h2 className="text-5xl sm:text-[4rem] font-extrabold leading-[1.0] tracking-[-0.02em] mb-5" style={{ color: "#F1EFF8", textShadow: "0 2px 22px rgba(0,0,0,0.6), 0 0 60px rgba(120,92,220,0.3)" }}>
                  Join and track<br />your <span style={{ color: "#A5B4FC" }}>finances</span>
                </h2>
                <p className="text-base sm:text-lg max-w-md mx-auto mb-9" style={{ color: "rgba(200,198,220,0.82)" }}>Create your account in seconds and start making smarter financial decisions today.</p>

                {/* feature strip — one long glass bar with four columns */}
                <div className="mx-auto max-w-4xl mb-9 rounded-2xl overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-y divide-white/[0.07] lg:divide-y-0 lg:divide-x lg:divide-white/[0.08]" style={{
                  background: "rgba(14,12,26,0.45)",
                  border: "1px solid rgba(190,176,255,0.20)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 0 40px rgba(124,92,224,0.12)",
                }}>
                  {[
                    { icon:Wallet,    label:"Track Expenses",  sub:"See where your money goes" },
                    { icon:PieChart,  label:"Smart Insights",  sub:"Understand your spending patterns" },
                    { icon:Target,    label:"Set Goals",       sub:"Plan and achieve your financial goals" },
                    { icon:Shield,    label:"Secure & Private", sub:"Your data is always protected" },
                  ].map(({ icon:Icon, label, sub })=>(
                    <div key={label} className="flex items-start gap-2.5 px-4 py-4 text-left">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                        background: "linear-gradient(150deg, rgba(126,94,228,0.4), rgba(80,60,180,0.18))",
                        border: "1px solid rgba(190,176,255,0.32)",
                        boxShadow: "0 0 16px rgba(132,102,238,0.28)",
                      }}>
                        <Icon className="w-[18px] h-[18px]" style={{ color: "#CDC2FF" }} />
                      </div>
                      <div>
                        <p className="text-white text-[13px] font-semibold leading-tight">{label}</p>
                        <p className="text-[11px] mt-1 leading-snug" style={{ color: "rgba(168,164,194,0.82)" }}>{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/signup" className="flex items-center justify-center gap-2.5 mx-auto max-w-md text-white font-bold px-10 py-4 rounded-full hover:brightness-110 transition-all text-base" style={{
                  background: "linear-gradient(90deg,#6366F1,#8B5CF6)",
                  boxShadow: "0 0 44px rgba(124,92,224,0.55), inset 0 1px 0 rgba(255,255,255,0.22)",
                }}>
                  <Sparkles className="w-4 h-4" />
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="mt-5 flex items-center justify-center gap-1.5 text-xs" style={{ color: "rgba(180,176,204,0.8)" }}>
                  <Shield className="w-3.5 h-3.5" style={{ color: "#A99CFF" }} />
                  Free to start &middot; No credit card required
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/[0.06] py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 mb-10">
              <div className="sm:col-span-1">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{
                    background: "linear-gradient(150deg, rgba(126,94,228,0.55), rgba(80,60,180,0.28))",
                    border: "1px solid rgba(190,176,255,0.42)",
                    boxShadow: "0 0 22px rgba(132,102,238,0.4), inset 0 1px 0 rgba(255,255,255,0.16)",
                  }}>
                    <TrendingUp className="w-5 h-5" style={{ color: "#CFC4FF" }} />
                  </div>
                  <span className="text-lg font-bold text-white tracking-tight">Credo</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed mb-4 max-w-[15rem]">Your all-in-one finance companion. Track, analyze, and grow your money with confidence.</p>
                <div className="flex items-center gap-3">
                  {([Share2,AtSign,Send,Mail] as const).map((Icon,i)=>(
                    <a key={i} href="#" aria-label="Social link" className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors" style={{
                      border: "1px solid rgba(150,120,240,0.32)",
                      boxShadow: "0 0 14px rgba(124,92,224,0.18)",
                    }}>
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-white text-sm font-semibold mb-4">Product</h4>
                <ul className="space-y-2.5">
                  {["Features","How It Works","Pricing"].map(item=>(
                    <li key={item}><a href="#" className="text-slate-500 text-sm hover:text-slate-300 transition-colors">{item}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-white text-sm font-semibold mb-4">Support</h4>
                <ul className="space-y-2.5">
                  {["FAQs","Contact Support","Contact Us"].map(item=>(
                    <li key={item}><a href="#" className="text-slate-500 text-sm hover:text-slate-300 transition-colors">{item}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-white text-sm font-semibold mb-4">Legal</h4>
                <ul className="space-y-2.5">
                  {[{label:"Terms & Conditions",href:"/terms"},{label:"Privacy Policy",href:"/privacy"},{label:"Cookie Policy",href:"#"},{label:"Refund Policy",href:"#"},{label:"Data Protection",href:"#"}].map(item=>(
                    <li key={item.label}><Link href={item.href} className="text-slate-500 text-sm hover:text-slate-300 transition-colors">{item.label}</Link></li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <p className="text-xs text-slate-600">&copy; 2026 Credo. All rights reserved.</p>
              <button className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors rounded-full px-4 py-2 border border-white/[0.08] flex-shrink-0" style={{ background: "rgba(16,14,28,0.6)" }}>
                <Globe className="w-4 h-4" />
                English
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
