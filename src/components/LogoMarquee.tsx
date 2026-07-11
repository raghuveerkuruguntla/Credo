"use client";

// Partner-bank logo marquee. An honest trust signal: Credo connects accounts
// through Plaid, which reaches 11,000+ institutions — so the marquee shows real
// supported banks rather than invented customer logos. The track is duplicated
// once so the CSS translateX(-50%) loop is seamless; it pauses on hover and
// freezes under prefers-reduced-motion (see globals.css .marquee-track).

const LOGOS: { file: string; treat: "white" | "color" }[] = [
  { file: "Chase_Logo.png", treat: "white" },
  { file: "Wells_Fargo.png", treat: "color" },
  { file: "BOFA.png", treat: "white" },
  { file: "PNC.png", treat: "white" },
  { file: "CAPITALONE.png", treat: "white" },
  { file: "AMEX.png", treat: "color" },
  { file: "TRUIST.png", treat: "white" },
  { file: "CITI.png", treat: "white" },
];

const SHADOW = "drop-shadow(0 1px 6px rgba(0,0,0,0.55))";

function Mark({ file, treat }: { file: string; treat: "white" | "color" }) {
  return (
    <span className="flex items-center justify-center shrink-0 px-8 sm:px-12">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/logos/cut/${file}`}
        alt=""
        loading="lazy"
        decoding="async"
        className="object-contain h-7 sm:h-8 w-auto opacity-70 hover:opacity-100 transition-opacity"
        style={{
          filter:
            treat === "white" ? `brightness(0) invert(1) ${SHADOW}` : SHADOW,
        }}
      />
    </span>
  );
}

export default function LogoMarquee() {
  const row = [...LOGOS, ...LOGOS];
  return (
    <div className="relative overflow-hidden">
      {/* edge fades so logos dissolve into the page rather than hard-cropping */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-40 z-10"
        style={{
          background: "linear-gradient(to right, #000 0%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-40 z-10"
        style={{
          background: "linear-gradient(to left, #000 0%, transparent 100%)",
        }}
      />
      <div className="marquee-track py-2">
        {row.map((l, i) => (
          <Mark key={i} file={l.file} treat={l.treat} />
        ))}
      </div>
    </div>
  );
}
