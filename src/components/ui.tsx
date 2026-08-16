import { useEffect, useRef, useState, type ReactNode } from "react";
import { TIER_META, type Tier } from "../lib/types";

/* ---------- hooks ---------- */

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

export function useCountUp(target: number | null, duration = 850): number | null {
  const reduced = useReducedMotion();
  const [val, setVal] = useState<number | null>(target);
  const fromRef = useRef(0);

  useEffect(() => {
    if (target === null) {
      setVal(null);
      return;
    }
    if (reduced) {
      fromRef.current = target;
      setVal(target);
      return;
    }
    const from = fromRef.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, duration]);

  return val;
}

/* ---------- scroll reveal ---------- */

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------- confidence badge ---------- */

export function TierBadge({ tier, title }: { tier: Tier; title?: string }) {
  const meta = TIER_META[tier];
  const full = title ? `${title}\n\n${meta.blurb}` : meta.blurb;
  return (
    <span
      title={full}
      className="inline-flex cursor-help items-center gap-1.5 rounded-full border px-2 py-[3px] font-mono text-[9px] font-semibold tracking-[0.14em]"
      style={{
        color: meta.color,
        borderColor: `${meta.color}55`,
        background: `${meta.color}12`,
      }}
    >
      <span className="h-[5px] w-[5px] rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function TierLegend() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(Object.keys(TIER_META) as Tier[]).map((t) => {
        const m = TIER_META[t];
        return (
          <div key={t} className="flex items-start gap-3 rounded-lg border border-linesoft bg-pit/60 p-3">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: m.color }} />
            <div>
              <div className="font-mono text-[10px] font-bold tracking-[0.18em]" style={{ color: m.color }}>
                {m.label}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-dim">{m.blurb}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- living visuals ---------- */

export function EqBars({ count = 28, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`flex items-end gap-[3px] ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="eq-bar w-[4px] rounded-t-[2px] bg-amber"
          style={{
            height: `${16 + ((i * 37) % 26)}px`,
            animationDelay: `${(i % 9) * 0.07}s`,
            animationDuration: `${0.7 + ((i * 13) % 50) / 100}s`,
            opacity: 0.5 + ((i * 29) % 45) / 100,
          }}
        />
      ))}
    </div>
  );
}

function wavePath(amp: number, y: number): string {
  let d = `M0 ${y}`;
  for (let x = 0; x <= 600; x += 5) {
    const v =
      Math.sin(x / 34) * Math.sin(x / 12.3) * amp * (0.45 + 0.55 * Math.abs(Math.sin(x / 190 + 1)));
    d += ` L${x} ${(y - v).toFixed(1)}`;
  }
  return d;
}

export function Scope({ className = "" }: { className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`} aria-hidden="true">
      <div className="scope-drift flex w-[200%]">
        {[0, 1].map((k) => (
          <svg key={k} viewBox="0 0 600 36" preserveAspectRatio="none" className="h-full w-1/2 shrink-0">
            <path d={wavePath(13, 18)} fill="none" stroke="#f0a63f" strokeWidth="1.4" opacity="0.75" />
            <path d={wavePath(7, 18)} fill="none" stroke="#58c7d8" strokeWidth="1" opacity="0.35" />
          </svg>
        ))}
      </div>
    </div>
  );
}

export function FlatlineBlip() {
  return (
    <svg viewBox="0 0 600 60" preserveAspectRatio="none" className="h-14 w-full" aria-hidden="true">
      <line x1="0" y1="30" x2="600" y2="30" stroke="#27303f" strokeWidth="1.5" />
      <path
        className="blip-line"
        d="M0 30 H180 L200 30 210 10 220 50 230 20 238 34 244 30 H420 L436 30 444 16 452 42 460 30 H600"
        fill="none"
        stroke="#f0a63f"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
