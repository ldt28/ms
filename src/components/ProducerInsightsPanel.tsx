import type { ReportData } from "../lib/types";
import { generateProducerInsights } from "../lib/producerInsights";
import { TierBadge } from "./ui";

interface ProducerInsightsPanelProps {
  report: ReportData;
}

export function ProducerInsightsPanel({ report }: ProducerInsightsPanelProps) {
  const insights = generateProducerInsights(report);

  return (
    <div className="panel ticks overflow-hidden px-5 py-5 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="kicker">06 · AI Producer & Mix Feedback</div>
          <h3 className="font-display text-lg leading-tight text-ink">
            Production & Mix Quality Scorecard
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-mint/40 bg-mint/10 px-3 py-1 font-mono text-[11px] font-bold text-mint">
            OVERALL: {insights.overallScore}/100
          </span>
          <TierBadge tier="estimated" title="Rule-based heuristic inference on DSP metrics & arrangement structure" />
        </div>
      </div>

      {/* Main Scorecard Banner */}
      <div className="mb-5 rounded-2xl border border-linesoft bg-pit/80 p-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Score Ring */}
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-amber bg-surface/80 shadow-lg shadow-amber/20">
              <span className="font-mono text-2xl font-bold text-ink">
                {insights.overallScore}
              </span>
            </div>
            <div>
              <div className="kicker">Commercial Readiness</div>
              <h4 className="font-display text-lg font-bold text-ink">
                {insights.commercialVerdict}
              </h4>
              <p className="mt-0.5 font-mono text-xs text-dim">
                Based on crest factor, spectral centroid, section pacing, and harmonic tension.
              </p>
            </div>
          </div>

          {/* Dynamic Contrast Highlight */}
          {insights.dynamicContrastLiftPct !== null && (
            <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-cyanx/40 bg-cyanx/10 px-5 py-3 text-center">
              <span className="font-mono text-[10px] font-bold tracking-widest text-cyanx uppercase">
                Verse ➔ Chorus Lift
              </span>
              <span className="font-mono text-2xl font-bold text-ink">
                {insights.dynamicContrastLiftPct > 0 ? `+${insights.dynamicContrastLiftPct}%` : `${insights.dynamicContrastLiftPct}%`}
              </span>
              <span className="font-mono text-[9.5px] text-faint">
                {insights.dynamicContrastLiftPct >= 20 ? "🔥 Strong Drop Impact" : "⚖️ Smooth Pacing"}
              </span>
            </div>
          )}
        </div>

        {/* 4 Score Gauges Grid */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-linesoft pt-4">
          {Object.entries(insights.scores).map(([key, cat]) => (
            <div key={key} className="rounded-lg border border-line bg-surface/50 p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-dim">{cat.label}</span>
                <span
                  className="font-mono text-xs font-bold"
                  style={{ color: cat.color }}
                >
                  {cat.score}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-pit">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${cat.score}%`, background: cat.color }}
                />
              </div>
              <div className="mt-1.5 font-mono text-[9.5px] text-faint truncate">
                {cat.verdict}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Columns: Strengths vs Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: What Works Well (Strengths) */}
        <div className="rounded-xl border border-mint/30 bg-pit/70 p-4">
          <div className="kicker mb-3 flex items-center gap-1.5 text-mint">
            <span>✨</span>
            <span>Production Strengths</span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {insights.strengths.map((str, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-ink">
                <span className="text-mint font-bold">✓</span>
                <span className="leading-relaxed">{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Actionable Suggestions */}
        <div className="rounded-xl border border-amber/30 bg-pit/70 p-4">
          <div className="kicker mb-3 flex items-center gap-1.5 text-amber">
            <span>💡</span>
            <span>Mix & Arrangement Suggestions</span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {insights.recommendations.map((rec, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 rounded-lg border border-linesoft bg-surface/40 p-2.5"
              >
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                    rec.importance === "high"
                      ? "bg-rosex/20 text-rosex border border-rosex/40"
                      : rec.importance === "medium"
                        ? "bg-amber/20 text-amber border border-amber/40"
                        : "bg-cyanx/20 text-cyanx border border-cyanx/40"
                  }`}
                >
                  {rec.importance}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block font-mono text-[9.5px] text-dim font-semibold">
                    {rec.category}
                  </span>
                  <p className="mt-0.5 text-xs text-ink leading-relaxed">{rec.tip}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
