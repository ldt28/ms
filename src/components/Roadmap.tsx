import { useEffect, useMemo, useState } from "react";
import { PHASES, TOTAL_STEPS } from "../lib/roadmapData";
import { Reveal } from "./ui";

const LS_KEY = "signal.roadmap.v1";

function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function CmdChip({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };
  return (
    <span className="mt-1.5 inline-flex max-w-full items-center gap-2 rounded-md border border-line bg-pit px-2.5 py-1.5">
      <code className="min-w-0 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-mint">{cmd}</code>
      <button
        onClick={copy}
        className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[9px] tracking-[0.12em] text-dim transition hover:border-amber/60 hover:text-amber"
        aria-label={`Copy command ${cmd}`}
      >
        {copied ? "COPIED" : "COPY"}
      </button>
    </span>
  );
}

export function Roadmap() {
  const [checked, setChecked] = useState<Set<string>>(loadChecked);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify([...checked]));
    } catch {
      /* storage unavailable */
    }
  }, [checked]);

  const done = useMemo(() => {
    let n = 0;
    for (const p of PHASES) for (const s of p.steps) if (checked.has(s.id)) n++;
    return n;
  }, [checked]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Reveal>
        <div className="panel ticks px-6 py-6 sm:px-8">
          <div className="kicker">The whole process · one piece · in order</div>
          <h2 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">
            Build plan<span className="text-amber">.</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim">
            Every step to take the Signal MVP from zero to a running analyzer — where to go, what to type, what to
            test, and what to do when it breaks. Tick things off; progress is saved on this machine.
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between font-mono text-[11px] text-dim">
              <span>
                {done} / {TOTAL_STEPS} steps complete
              </span>
              <button
                onClick={() => setChecked(new Set())}
                className="tracking-[0.12em] text-faint transition hover:text-rosex"
              >
                RESET
              </button>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-pit">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber/80 to-mint transition-[width] duration-500 ease-out"
                style={{ width: `${TOTAL_STEPS ? (done / TOTAL_STEPS) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mt-6 flex flex-col gap-5">
        {PHASES.map((phase, pi) => {
          const phaseDone = phase.steps.filter((s) => checked.has(s.id)).length;
          const complete = phaseDone === phase.steps.length;
          return (
            <Reveal key={phase.id} delay={Math.min(pi * 40, 200)}>
              <section
                className={`panel px-5 py-5 transition-colors sm:px-6 ${complete ? "border-mint/40" : ""}`}
              >
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-amber">{phase.num}</span>
                  <h3 className="font-display text-lg text-ink">{phase.title}</h3>
                  <span className="ml-auto font-mono text-[10px] text-dim">
                    {phaseDone}/{phase.steps.length}
                  </span>
                </div>
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-cyanx/40 bg-cyanx/8 px-2.5 py-0.5">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 text-cyanx" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21s-7-5.1-7-11a7 7 0 1 1 14 0c0 5.9-7 11-7 11z" strokeLinejoin="round" />
                    <circle cx="12" cy="10" r="2.4" />
                  </svg>
                  <span className="font-mono text-[9.5px] tracking-[0.14em] text-cyanx">GO TO: {phase.where.toUpperCase()}</span>
                </div>

                <ul className="mt-4 flex flex-col gap-2.5">
                  {phase.steps.map((step) => {
                    const isDone = checked.has(step.id);
                    return (
                      <li key={step.id}>
                        <button
                          onClick={() => toggle(step.id)}
                          className="group flex w-full items-start gap-3 rounded-lg border border-transparent px-2 py-1.5 text-left transition hover:border-linesoft hover:bg-pit/60"
                        >
                          <span
                            className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
                              isDone ? "border-mint bg-mint text-[#06231a]" : "border-line bg-pit group-hover:border-amber/60"
                            }`}
                            aria-hidden="true"
                          >
                            {isDone && (
                              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.4">
                                <path d="M2 6.5 4.6 9 10 3.4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block text-sm leading-snug transition-colors ${
                                isDone ? "text-faint line-through decoration-faint" : "text-ink"
                              }`}
                            >
                              {step.text}
                            </span>
                            {step.cmd && !isDone && <CmdChip cmd={step.cmd} />}
                            {step.go && (
                              <span className="mt-1 block font-mono text-[10px] leading-relaxed text-cyanx/90">
                                → {step.go}
                              </span>
                            )}
                            {step.note && (
                              <span className="mt-0.5 block font-mono text-[10px] leading-relaxed text-faint">
                                {step.note}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={120}>
        <div className="panel mt-6 px-6 py-5 sm:px-8">
          <div className="kicker">House rules</div>
          <ul className="mt-3 grid gap-2 text-sm text-dim sm:grid-cols-2">
            <li className="flex gap-2"><span className="text-amber">▸</span> No YouTube / Spotify audio extraction — uploads only.</li>
            <li className="flex gap-2"><span className="text-amber">▸</span> Full lyrics are never redisplayed; hooks are short fragments.</li>
            <li className="flex gap-2"><span className="text-amber">▸</span> Every estimate carries a confidence tier and a source.</li>
            <li className="flex gap-2"><span className="text-amber">▸</span> Failures return explicit errors — never silently faked results.</li>
          </ul>
        </div>
      </Reveal>
    </div>
  );
}
