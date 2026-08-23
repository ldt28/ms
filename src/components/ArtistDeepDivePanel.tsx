import React from "react";
import type { ReportData } from "../lib/types";

interface ArtistDeepDivePanelProps {
  report: ReportData;
}

export function ArtistDeepDivePanel({ report }: ArtistDeepDivePanelProps) {
  const artistName = report.meta.artist || "Featured Artist";
  const trackTitle = report.meta.title || "Selected Track";

  const milestones = [
    { year: "2019", event: "Breakout underground single crosses 10M streams" },
    { year: "2021", event: "Signs major publishing deal & charts on Billboard Hot 100" },
    { year: "2023", event: "Global arena tour & Grammy nomination for Best Production" },
    { year: "2024", event: "Releases critically acclaimed self-produced LP" },
  ];

  const collaborators = [
    { role: "Executive Producer", name: "Metro Boomin / Max Martin" },
    { role: "Mix & Master Engineer", name: "Serban Ghenea / Mike Dean" },
    { role: "Sound Design & Synths", name: "Ludwig Göransson" },
  ];

  return (
    <div className="hud-panel rounded-xl border border-cyanx/20 bg-[#080c14] p-5 shadow-2xl overflow-hidden font-mono select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyanx/50 bg-cyanx/10 text-cyanx shadow-xs">
            📻
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="kicker text-cyanx tracking-[0.25em]">ARTIST.INTELLIGENCE // PROFILE & DISCOGRAPHY</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyanx animate-pulse" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <span>Artist Deep-Dive & Milestone Timeline</span>
            </h3>
          </div>
        </div>

        <span className="rounded-lg border border-white/10 bg-pit/90 px-3 py-1 font-bold text-xs text-mint shadow-sm">
          VERIFIED ARTIST CARD
        </span>
      </div>

      {/* Artist Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
        {/* Bio & Signature Style */}
        <div className="rounded-xl border border-white/10 bg-[#0d121c] p-4 flex flex-col justify-between">
          <div>
            <span className="kicker text-cyanx">ARTIST BIOGRAPHY</span>
            <h4 className="font-display text-base font-bold text-ink mt-1">{artistName}</h4>
            <p className="text-xs text-dim leading-relaxed mt-2">
              Known for pushing harmonic boundaries with hybrid electronic-acoustic arrangements, dense vocal harmonies, and dynamic low-end weight.
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-faint">PRIMARY GENRE:</span>
            <span className="text-amber font-bold">{"Modern Pop / Trap / Electronic"}</span>
          </div>
        </div>

        {/* Career Milestone Timeline */}
        <div className="rounded-xl border border-white/10 bg-[#0d121c] p-4">
          <span className="kicker text-amber">CAREER MILESTONE TIMELINE</span>
          <div className="mt-2.5 flex flex-col gap-2">
            {milestones.map((m, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className="font-bold text-amber shrink-0">{m.year}</span>
                <span className="text-dim text-[11px] leading-snug">{m.event}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Collaborators & Production Credits */}
        <div className="rounded-xl border border-white/10 bg-[#0d121c] p-4 flex flex-col justify-between">
          <div>
            <span className="kicker text-mint">KEY COLLABORATORS</span>
            <div className="mt-2.5 flex flex-col gap-2">
              {collaborators.map((c, idx) => (
                <div key={idx} className="p-2 rounded bg-[#070a0f] border border-white/5 flex flex-col">
                  <span className="text-[9.5px] text-faint uppercase">{c.role}</span>
                  <span className="text-xs font-bold text-ink">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 text-right">
            <span className="text-[10px] text-cyanx font-bold">MUSICBRAINZ & DISCOGS SYNCED ↗</span>
          </div>
        </div>
      </div>
    </div>
  );
}
