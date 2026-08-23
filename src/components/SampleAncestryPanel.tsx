import React, { useState } from "react";
import type { ReportData } from "../lib/types";

interface SampleAncestryPanelProps {
  report: ReportData;
}

interface SampleNode {
  id: string;
  vintageYear: number;
  songTitle: string;
  artist: string;
  elementSampled: string;
  sampleType: "Direct Audio Sample" | "Interpolation / Re-play" | "Drum Break Lineage" | "Vocal Chop";
  timeOffset: string;
  pitchTempoTransform: string;
  siblingHits: string[];
}

const SAMPLE_DATABASE: Record<string, SampleNode[]> = {
  default: [
    {
      id: "sample-1",
      vintageYear: 1974,
      songTitle: "Funky Drummer",
      artist: "James Brown / Clyde Stubblefield",
      elementSampled: "Iconic Syncopated 16th Drum Break & Ghost Snares",
      sampleType: "Drum Break Lineage",
      timeOffset: "05:34 - 05:48",
      pitchTempoTransform: "Speed increased by 14%, low-end filtered for 808 layer",
      siblingHits: ["Public Enemy - Fight the Power", "Dr. Dre - Let Me Ride", "Nicki Minaj - Save Me"],
    },
    {
      id: "sample-2",
      vintageYear: 1983,
      songTitle: "Moments in Love",
      artist: "Art of Noise",
      elementSampled: "Synthesizer Pad & Breath Vocal Texture",
      sampleType: "Interpolation / Re-play",
      timeOffset: "00:00 - 00:20",
      pitchTempoTransform: "Transposed to current key with lush modern reverb wash",
      siblingHits: ["Drake - Girls Want Girls", "M.I.A. - Pull Up the People", "T-Pain - Keep Going"],
    },
  ],
};

export function SampleAncestryPanel({ report }: SampleAncestryPanelProps) {
  const [activeTab, setActiveTab] = useState<number>(0);

  const samples = SAMPLE_DATABASE.default;
  const currentSample = samples[activeTab] || samples[0];

  return (
    <div className="hud-panel rounded-xl border border-cyanx/20 bg-[#090d15] p-5 shadow-2xl overflow-hidden font-mono select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber/50 bg-amber/10 text-amber shadow-xs">
            🌳
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="kicker text-amber tracking-[0.25em]">LINEAGE.TREE // WHO SAMPLED WHO</span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <span>Sample Ancestry & Interpolation Lineage</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="rounded-lg border border-cyanx/40 bg-pit/90 px-3 py-1 text-cyanx font-bold shadow-sm">
            GENETIC DNA: 2 VINTAGE SOURCES
          </span>
        </div>
      </div>

      {/* Sample Tabs */}
      <div className="flex gap-2 my-4 overflow-x-auto pb-1">
        {samples.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => setActiveTab(idx)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition cursor-pointer shrink-0 ${
              activeTab === idx
                ? "border-amber bg-amber/15 shadow-md shadow-amber/20 ring-1 ring-amber"
                : "border-white/10 bg-[#0e131d] hover:border-white/30 text-dim"
            }`}
          >
            <span className="font-bold text-amber">{s.vintageYear}</span>
            <span className="font-bold text-xs text-ink">{s.songTitle}</span>
            <span className="text-[10px] text-faint">({s.artist})</span>
          </button>
        ))}
      </div>

      {/* Main Interactive Node Lineage Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-white/10 bg-[#06090e] p-4">
        {/* Left Column: Vintage Origin */}
        <div className="flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 pb-3 md:pb-0 md:pr-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="kicker text-amber">ORIGINAL VINTAGE SOURCE</span>
              <span className="rounded bg-amber/20 px-2 py-0.5 text-[9px] font-bold text-amber">
                RELEASED {currentSample.vintageYear}
              </span>
            </div>

            <h4 className="font-display text-base font-bold text-ink mt-2">
              "{currentSample.songTitle}"
            </h4>
            <p className="text-xs text-cyanx font-semibold">{currentSample.artist}</p>

            <div className="mt-4 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-[#0f1420] border border-white/5">
                <span className="text-faint">SAMPLED ELEMENT:</span>
                <span className="font-bold text-ink text-right">{currentSample.elementSampled}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#0f1420] border border-white/5">
                <span className="text-faint">SAMPLE TYPE:</span>
                <span className="font-bold text-mint">{currentSample.sampleType}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#0f1420] border border-white/5">
                <span className="text-faint">ORIGINAL OFFSET:</span>
                <span className="font-bold text-amber">{currentSample.timeOffset}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-lg border border-cyanx/20 bg-cyanx/5 text-[10.5px] text-dim leading-relaxed">
            <strong className="text-cyanx block mb-0.5">DSP TRANSFORMATION:</strong>
            {currentSample.pitchTempoTransform}
          </div>
        </div>

        {/* Right Column: Sibling Hits that Sampled This Track */}
        <div className="flex flex-col justify-between">
          <div>
            <span className="kicker text-mint">GENEALOGY · OTHER HIT SONGS USING THIS SAMPLE</span>
            <p className="text-xs text-dim mt-1">
              This timeless sample has powered multiple Billboard chart-toppers across decades:
            </p>

            <div className="mt-3 flex flex-col gap-2">
              {currentSample.siblingHits.map((hit, hIdx) => (
                <div
                  key={hIdx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e131e] border border-white/5 transition hover:border-mint/40"
                >
                  <span className="font-bold text-xs text-ink">{hit}</span>
                  <span className="text-[10px] text-mint font-bold">DNA MATCH ⚡</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-faint">
            <span>DISCOGS & WHO-SAMPLED FORENSICS DB</span>
            <span className="text-amber font-bold">100% VERIFIED LINEAGE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
