// Decorative animated background — small dots drifting continuously across
// the screen. Purely cosmetic; sits behind content, ignores pointer events.

// Deterministic pseudo-random so SSR and client markup match (no hydration warnings).
function rng(seed: number) {
  const x = Math.sin(seed * 9973.3) * 10000;
  return x - Math.floor(x);
}

const DOTS = Array.from({ length: 40 }, (_, i) => {
  const size = 2 + rng(i + 1) * 3;          // 2–5px
  const left = rng(i + 11) * 100;           // 0–100% across
  const duration = 12 + rng(i + 21) * 16;   // 12–28s to cross
  const delay = -rng(i + 31) * 28;          // negative → already mid-flight on load
  const opacity = 0.3 + rng(i + 41) * 0.5;  // 0.3–0.8
  return { size, left, duration, delay, opacity };
});

export default function AnimatedBackground() {
  return (
    <div className="bg-animated" aria-hidden="true">
      {DOTS.map((d, i) => (
        <span
          key={i}
          className="dot"
          style={{
            left: `${d.left}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
            opacity: d.opacity,
          }}
        />
      ))}
    </div>
  );
}
