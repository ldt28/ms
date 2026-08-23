import { useState } from "react";
import { GENRE_FAMILIES, type GenreFamily, type SubgenreInfo } from "../lib/genreData";
import { generateDemoAudioFile } from "../lib/demoTracks";

interface GenreLabProps {
  onLoadTemplateToWorkbench: (title: string, artist: string, lyrics: string, file: File) => void;
}

export function GenreLab({ onLoadTemplateToWorkbench }: GenreLabProps) {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("pop");
  const [selectedSubgenreId, setSelectedSubgenreId] = useState<string>("synthpop");
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const currentFamily = GENRE_FAMILIES.find((f) => f.id === selectedFamilyId) ?? GENRE_FAMILIES[0];
  const currentSubgenre =
    currentFamily.subgenres.find((s) => s.id === selectedSubgenreId) ?? currentFamily.subgenres[0];

  const handleSelectFamily = (family: GenreFamily) => {
    setSelectedFamilyId(family.id);
    setSelectedSubgenreId(family.subgenres[0].id);
  };

  const handleLoadTemplate = async () => {
    setLoadingTemplate(true);
    try {
      const file = await generateDemoAudioFile(currentSubgenre.demoStyle);
      onLoadTemplateToWorkbench(
        currentSubgenre.demoTitle,
        currentSubgenre.demoArtist,
        currentSubgenre.demoLyrics,
        file
      );
    } catch (err) {
      console.error("Failed to generate genre template audio", err);
    } finally {
      setLoadingTemplate(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="panel ticks relative overflow-hidden px-6 py-6 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="kicker">Genre Study & Production Vault</div>
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
              Genre DNA & Arrangement Blueprints
            </h1>
            <p className="mt-1 max-w-2xl font-mono text-xs text-dim leading-relaxed">
              Explore harmonic chord sequences, tempo ranges, dynamic section pacing, and mix standards across all major music genres.
            </p>
          </div>

          <button
            onClick={handleLoadTemplate}
            disabled={loadingTemplate}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber px-5 py-3 font-mono text-xs font-bold text-black shadow-lg shadow-amber/20 transition hover:bg-amber/90 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <span>{loadingTemplate ? "⏳ Synthesizing..." : "🚀 Load Blueprint into Workbench ➔"}</span>
          </button>
        </div>

        {/* 1. Main Genre Families Cards */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {GENRE_FAMILIES.map((family) => {
            const isSelected = family.id === selectedFamilyId;
            return (
              <button
                key={family.id}
                onClick={() => handleSelectFamily(family)}
                className={`flex flex-col items-start rounded-xl border p-4 text-left transition cursor-pointer ${
                  isSelected
                    ? "border-amber bg-surface/90 shadow-md shadow-amber/10 ring-1 ring-amber/50"
                    : "border-linesoft bg-pit/60 hover:border-line hover:bg-surface/50"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-2xl">{family.icon}</span>
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-amber shadow-sm shadow-amber animate-pulse" />
                  )}
                </div>
                <span className="font-display text-sm font-bold text-ink">{family.name}</span>
                <span className="mt-0.5 font-mono text-[10px] text-dim line-clamp-1">{family.tagline}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Sub-genre Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="font-mono text-xs text-faint uppercase tracking-wider shrink-0 mr-1">
          Sub-Genres:
        </span>
        {currentFamily.subgenres.map((sub) => {
          const isSelected = sub.id === selectedSubgenreId;
          return (
            <button
              key={sub.id}
              onClick={() => setSelectedSubgenreId(sub.id)}
              className={`rounded-lg border px-3.5 py-1.5 font-mono text-xs font-semibold transition shrink-0 cursor-pointer ${
                isSelected
                  ? "border-cyanx bg-cyanx/15 text-cyanx font-bold shadow-sm shadow-cyanx/20"
                  : "border-linesoft bg-surface text-dim hover:text-ink"
              }`}
            >
              {sub.name}
            </button>
          );
        })}
      </div>

      {/* 3. Deep-Dive Production DNA Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* A. Tempo & Groove */}
        <div className="panel ticks p-5 flex flex-col justify-between">
          <div>
            <div className="kicker mb-1 text-cyanx">01 · Tempo & Groove Feel</div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-mono text-3xl font-bold text-ink">{currentSubgenre.avgBpm}</span>
              <span className="font-mono text-xs text-dim">BPM ({currentSubgenre.bpmRange})</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded border border-line bg-pit px-2 py-0.5 font-mono text-[10px] text-amber">
                Meter: {currentSubgenre.timeSignature}
              </span>
            </div>
            <p className="mt-3 font-mono text-xs text-dim leading-relaxed border-t border-linesoft pt-3">
              {currentSubgenre.grooveFeel}
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-cyanx/30 bg-cyanx/10 p-3 font-mono text-[10.5px] text-cyanx">
            ⚡ <strong>Timing Blueprint:</strong> Lock kick transients tightly to grid; add humanized swing on hi-hats.
          </div>
        </div>

        {/* B. Signature Chord Progressions */}
        <div className="panel ticks p-5 md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="kicker mb-1 text-amber">02 · Signature Harmonic Progressions</div>
            <h3 className="font-display text-base font-bold text-ink mt-1">
              Harmonic DNA & Roman Numeral Cadences
            </h3>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentSubgenre.signatureProgressions.map((prog, idx) => (
                <div key={idx} className="rounded-xl border border-linesoft bg-pit/80 p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-xs font-bold text-amber">{prog.roman}</span>
                      <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[9.5px] text-faint">
                        {prog.chords.join(" → ")}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-dim leading-relaxed mt-1">
                      {prog.description}
                    </p>
                  </div>
                  <div className="mt-2.5 border-t border-linesoft/70 pt-2 font-mono text-[10px] text-mint">
                    <span className="text-faint">Example Hits:</span> {prog.exampleHits.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* C. Arrangement & Song Structure */}
        <div className="panel ticks p-5 md:col-span-2 lg:col-span-3">
          <div className="kicker mb-1 text-mint">03 · Song Structure & Arrangement Flow</div>
          <h3 className="font-display text-base font-bold text-ink mt-1">
            Standard Section Sequence
          </h3>

          {/* Visual Timeline Strip */}
          <div className="mt-4 flex flex-wrap gap-2">
            {currentSubgenre.structure.sections.map((sec, sIdx) => (
              <div
                key={sIdx}
                className="flex-1 min-w-[110px] rounded-lg border border-linesoft bg-pit/90 p-3 text-center transition hover:border-mint/50 hover:bg-surface"
              >
                <span className="font-mono text-[10px] text-dim block">Step 0{sIdx + 1}</span>
                <span className="font-mono text-xs font-bold text-ink block mt-0.5">{sec}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-mint/30 bg-mint/10 p-3 font-mono text-xs text-mint">
            🎯 <strong>Pacing Rule:</strong> {currentSubgenre.structure.pacingRule}
          </div>
        </div>

        {/* D. Essential Instrumentation Matrix */}
        <div className="panel ticks p-5">
          <div className="kicker mb-2 text-cyanx">04 · Core Instrumentation Stems</div>
          <ul className="flex flex-col gap-2 font-mono text-xs">
            <li className="rounded-lg border border-linesoft bg-pit/70 p-2.5">
              <span className="font-bold text-ink block mb-0.5">🥁 Rhythm:</span>
              <span className="text-dim text-[11px]">{currentSubgenre.instruments.rhythm.join(", ")}</span>
            </li>
            <li className="rounded-lg border border-linesoft bg-pit/70 p-2.5">
              <span className="font-bold text-ink block mb-0.5">🎸 Bass & Sub:</span>
              <span className="text-dim text-[11px]">{currentSubgenre.instruments.bass.join(", ")}</span>
            </li>
            <li className="rounded-lg border border-linesoft bg-pit/70 p-2.5">
              <span className="font-bold text-ink block mb-0.5">🎹 Harmony & Keys:</span>
              <span className="text-dim text-[11px]">{currentSubgenre.instruments.harmony.join(", ")}</span>
            </li>
            <li className="rounded-lg border border-linesoft bg-pit/70 p-2.5">
              <span className="font-bold text-ink block mb-0.5">🎛️ Leads & Melodies:</span>
              <span className="text-dim text-[11px]">{currentSubgenre.instruments.leads.join(", ")}</span>
            </li>
          </ul>
        </div>

        {/* E. Lyrical Themes & Flow */}
        <div className="panel ticks p-5">
          <div className="kicker mb-2 text-amber">05 · Lyrical Themes & Flow Cadence</div>
          <div className="flex flex-col gap-3 font-mono text-xs">
            <div className="rounded-lg border border-linesoft bg-pit/70 p-3">
              <span className="font-bold text-ink block mb-1">📝 Dominant Tropes:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {currentSubgenre.lyricThemes.themes.map((th, i) => (
                  <span key={i} className="rounded border border-line bg-surface px-2 py-0.5 text-[10.5px] text-amber">
                    {th}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-linesoft bg-pit/70 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-ink">Rhyme Density Target:</span>
                <span className="text-mint font-bold">{currentSubgenre.lyricThemes.rhymeDensityTarget}</span>
              </div>
              <span className="text-dim text-[10.5px] block mt-1">
                {currentSubgenre.lyricThemes.vocalProcessing}
              </span>
            </div>
          </div>
        </div>

        {/* F. Mix & Master Standards */}
        <div className="panel ticks p-5">
          <div className="kicker mb-2 text-mint">06 · Mix & Master Standards</div>
          <div className="flex flex-col gap-2.5 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-linesoft pb-2">
              <span className="text-dim">Target Loudness:</span>
              <span className="font-bold text-ink">{currentSubgenre.mixStandards.targetLufs}</span>
            </div>
            <div className="flex items-center justify-between border-b border-linesoft pb-2">
              <span className="text-dim">Dynamic Crest:</span>
              <span className="font-bold text-cyanx">{currentSubgenre.mixStandards.dynamicRange}</span>
            </div>
            <div className="border-b border-linesoft pb-2">
              <span className="text-dim text-[10.5px] block font-bold text-ink mb-0.5">Low-End EQ Rule:</span>
              <span className="text-dim text-[10px] leading-tight block">{currentSubgenre.mixStandards.subBassRule}</span>
            </div>
            <div>
              <span className="text-dim text-[10.5px] block font-bold text-mint mb-0.5">Pro Mix Tip:</span>
              <span className="text-faint text-[10px] leading-tight block">{currentSubgenre.mixStandards.mixTip}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
