import type { ReportData } from "../lib/types";
import { detectInstruments, INSTRUMENT_DEFINITIONS } from "../lib/instrumentEngine";
import { TierBadge } from "./ui";

interface InstrumentMatrixPanelProps {
  report: ReportData;
}

export function InstrumentMatrixPanel({ report }: InstrumentMatrixPanelProps) {
  const breakdown = report.instruments ?? detectInstruments(report);

  const allInstrumentIds = Object.keys(INSTRUMENT_DEFINITIONS) as (keyof typeof INSTRUMENT_DEFINITIONS)[];

  return (
    <div className="panel ticks overflow-hidden px-5 py-5 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="kicker">04 · Instrument & Stem Recognition</div>
          <h3 className="font-display text-lg leading-tight text-ink">
            Detected Instruments & Arrangement Matrix
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-cyanx/40 bg-cyanx/10 px-3 py-1 font-mono text-[11px] font-bold text-cyanx">
            {breakdown.detectedCount} OF 7 STEMS DETECTED
          </span>
          <TierBadge tier="estimated" title="DSP spectral band energy, transient flux, and formant analysis" />
        </div>
      </div>

      {/* 1. Detected Instruments Grid */}
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {breakdown.instruments.map((inst) => (
          <div
            key={inst.id}
            className={`rounded-xl border p-3.5 transition flex flex-col justify-between ${
              inst.detected
                ? "border-linesoft bg-pit/80 hover:border-line"
                : "border-linesoft/40 bg-pit/40 opacity-60"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-xl">{inst.icon}</span>
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                    inst.detected ? "bg-mint/15 text-mint border border-mint/30" : "bg-faint/20 text-faint"
                  }`}
                >
                  {inst.detected ? `${inst.confidencePct}% Presence` : "Subtle"}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-ink block truncate">{inst.name}</span>
              <span className="font-mono text-[9.5px] text-dim block mt-0.5">{inst.freqRange}</span>
            </div>

            <div className="mt-3 border-t border-linesoft/70 pt-2">
              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                <span className="text-faint">Mix Share</span>
                <span className="font-bold text-cyanx">{inst.mixSharePct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyanx to-mint transition-all duration-500"
                  style={{ width: `${inst.mixSharePct * 3}%` }}
                />
              </div>
              <p className="mt-1.5 font-mono text-[9px] text-faint line-clamp-2 leading-tight">
                {inst.timbreDescription}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Section Instrumentation Matrix Grid */}
      <div className="rounded-xl border border-linesoft bg-pit p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="kicker">Section Arrangement & Layering Matrix</span>
          <span className="font-mono text-[10px] text-dim">{breakdown.arrangementPacing}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-linesoft text-[10px] text-dim uppercase tracking-wider">
                <th className="pb-2 pr-3 font-medium">Section</th>
                {allInstrumentIds.map((id) => (
                  <th key={id} className="pb-2 px-2 text-center font-medium" title={INSTRUMENT_DEFINITIONS[id].name}>
                    <span className="text-base">{INSTRUMENT_DEFINITIONS[id].icon}</span>
                  </th>
                ))}
                <th className="pb-2 pl-3 font-medium text-right">Layering</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linesoft/50">
              {breakdown.sectionMatrix.map((sec, sIdx) => (
                <tr key={sIdx} className="hover:bg-surface/30 transition">
                  <td className="py-2.5 pr-3 font-bold text-ink whitespace-nowrap">
                    {sec.sectionLabel}
                  </td>

                  {allInstrumentIds.map((id) => {
                    const isActive = sec.activeInstruments.includes(id);
                    return (
                      <td key={id} className="py-2.5 px-2 text-center">
                        {isActive ? (
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-full bg-mint shadow-sm shadow-mint/50"
                            title={`${INSTRUMENT_DEFINITIONS[id].name} active in ${sec.sectionLabel}`}
                          />
                        ) : (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-line" />
                        )}
                      </td>
                    );
                  })}

                  <td className="py-2.5 pl-3 text-right text-[10.5px] text-dim whitespace-nowrap">
                    {sec.layeringDescription} ({sec.density} stems)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
