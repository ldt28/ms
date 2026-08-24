import React, { useState } from "react";
import type { ReportData } from "../lib/types";

interface AIProducerBlueprintProps {
  report: ReportData;
}

export function AIProducerBlueprint({ report }: AIProducerBlueprintProps) {
  const { meta, tempo, keySig, texture, energy, sections, lyrics, instruments, harmonics } = report;

  const bpm = tempo.value ? Math.round(tempo.value) : 120;
  const key = keySig.value || "B minor";
  const romanChords = harmonics?.progressionSummary || "i – VI – III – VII (Aeolian Loop)";
  const dominantFamily = instruments?.dominantFamily || "Drums & 808 Sub-Bass";
  const dynamicRange = energy ? `${energy.dynamicRangeDb.toFixed(1)} dB` : "11.2 dB";

  const [activeTab, setActiveTab] = useState<"blueprint" | "recipe" | "stems" | "ask">("blueprint");
  const [userQuestion, setUserQuestion] = useState("");
  const [aiChatLog, setAiChatLog] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    {
      role: "ai",
      text: `Welcome to the AI Producer Suite! I've analyzed "${meta.title}" by ${meta.artist || "the artist"} (${bpm} BPM, ${key}). Ask me anything about how this track was mixed, how to program the drums in FL Studio, or how to recreate the exact sound design.`,
    },
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const handleAskAi = (promptText?: string) => {
    const q = (promptText || userQuestion).trim();
    if (!q) return;

    setUserQuestion("");
    setAiChatLog((prev) => [...prev, { role: "user", text: q }]);
    setIsAiThinking(true);

    setTimeout(() => {
      let aiResponse = "";
      const lowerQ = q.toLowerCase();

      if (lowerQ.includes("808") || lowerQ.includes("bass") || lowerQ.includes("kick")) {
        aiResponse = `🥁 **808 & Low-End Blueprint for ${bpm} BPM (${key}):**\n1. **Root Tuning:** Tune your 808 sample to ${key.split(" ")[0]} (C1-D2 range) so the fundamental sine sits between 35 Hz and 65 Hz.\n2. **Kick Layering:** Use a short, punchy transient kick with a high-pass at 30 Hz and sidechain compress the 808 volume by -4 dB with a fast 45ms release.\n3. **Harmonic Saturation:** Apply soft-clipper or FabFilter Saturn (Warm Tape setting) to generate 2nd/3rd harmonics around 120-250 Hz so the bass cuts through mobile phone speakers.`;
      } else if (lowerQ.includes("chord") || lowerQ.includes("key") || lowerQ.includes("progression")) {
        aiResponse = `🎹 **Harmonic Architecture (${key} · ${romanChords}):**\n- **Progression:** ${romanChords}\n- **Voicing Strategy:** Use close-root voicings in octave 3, adding 7th or 9th color tones (e.g. maj7 / min7). Leave a frequency pocket between 300 Hz and 1.5 kHz for the lead vocal.\n- **DAW Tip:** In FL Studio Piano Roll, use the Strum tool (Alt+S) with a 15ms spread to give the chords an organic acoustic human feel.`;
      } else if (lowerQ.includes("vocal") || lowerQ.includes("mix") || lowerQ.includes("effect")) {
        aiResponse = `🎙️ **Vocal Mixing & Processing Chain:**\n1. **Subtractive EQ:** High-pass at 90 Hz, notch out boxy frequencies at 380 Hz (-2.5 dB, Q=3).\n2. **Compression:** Optical compressor (LA-2A style, 3-5 dB reduction) $\\to$ Fast FET compressor (1176 style, 4:1 ratio, fastest attack) for dynamic leveling.\n3. **Spatials:** 1/8-note ping-pong delay ducked behind lead vocals, sent to an analog plate reverb with 2.2s decay.`;
      } else if (lowerQ.includes("remake") || lowerQ.includes("step") || lowerQ.includes("fl studio")) {
        aiResponse = `🎛️ **Step-by-Step FL Studio Remake Guide:**\n1. Set Master Tempo to **${bpm} BPM**.\n2. In Channel Rack, lay down Kick on steps 1 and 9 (or syncopated trap steps 1, 7, 11).\n3. Place Snare / Clap on beats 2 & 4 (steps 5 & 13).\n4. Fill Hi-Hats every 2 steps (8th notes), and add 1/32 triplet rolls leading into step 5.\n5. Layer ${key} ${romanChords} on Rhodes or Grand Piano.\n6. Structure into 8-bar Intro $\\to$ 16-bar Verse $\\to$ 8-bar Chorus.`;
      } else {
        aiResponse = `✨ **Producer Analysis for "${meta.title}":**\n- **Tempo:** ${bpm} BPM (${bpm >= 130 ? "Fast tempo / Trap & Upbeat" : "Mid-tempo groove"})\n- **Key:** ${key} with ${romanChords}\n- **Dynamic Range:** ${dynamicRange} (commercial club/streaming target)\n- **Instrumentation:** Led by ${dominantFamily} with multi-track vocal and synth layering. To recreate this groove, focus on tight kick-808 phase alignment and wide stereo reverb on the leads.`;
      }

      setAiChatLog((prev) => [...prev, { role: "ai", text: aiResponse }]);
      setIsAiThinking(false);
    }, 600);
  };

  const samplePrompts = [
    `How do I tune and mix the 808 in ${key}?`,
    `What are the exact chord voicings for ${romanChords}?`,
    `How do I program the drum groove in FL Studio at ${bpm} BPM?`,
    `What vocal chain and reverb settings work best here?`,
  ];

  return (
    <div className="hud-panel rounded-2xl border border-amber/40 bg-gradient-to-b from-[#0e121d] via-[#090c13] to-[#06080d] p-5 sm:p-7 shadow-2xl font-mono text-xs select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber/60 bg-amber/20 text-amber text-xl shadow-md shadow-amber/20">
            🤖
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="kicker text-amber tracking-[0.25em]">AI PRODUCER SUITE // SONG RECONSTRUCTION</span>
              <span className="h-2 w-2 rounded-full bg-amber animate-ping" />
            </div>
            <h3 className="font-display text-lg sm:text-xl font-black text-ink">
              Song Blueprint & Producer Masterclass
            </h3>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "blueprint", label: "🏗️ SONG BLUEPRINT" },
            { id: "recipe", label: "🎛️ DAW REMAKE RECIPE" },
            { id: "stems", label: "🧬 STEM ARRANGEMENT" },
            { id: "ask", label: "💬 ASK AI PRODUCER" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`rounded-lg px-3 py-1.5 font-mono text-[10.5px] font-bold transition cursor-pointer shrink-0 ${
                activeTab === t.id
                  ? "bg-amber text-black shadow-md shadow-amber/30 font-black"
                  : "bg-pit/80 border border-white/10 text-dim hover:text-ink hover:border-amber/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Song Blueprint */}
      {activeTab === "blueprint" && (
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Rhythmic Core */}
          <div className="rounded-xl border border-white/10 bg-pit/70 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="kicker text-cyanx">01 · RHYTHMIC BLUEPRINT</span>
              <span className="font-mono text-[10px] text-amber font-bold">{bpm} BPM</span>
            </div>
            <h4 className="font-bold text-sm text-ink">Kick & Snare Cadence</h4>
            <p className="text-dim text-[11px] leading-relaxed">
              Track is anchored around a <strong>{bpm} BPM</strong> time signature with high-energy transient attacks. Kick hits on beats 1 & 3 with syncopated 16th-note ghost hits, while snare/clap locks the backbeat on 2 & 4.
            </p>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-faint">
              <span>Onset Rate: {texture?.onsetRate?.value?.toFixed(1) || "3.5"} hits/sec</span>
              <span className="text-mint font-bold">GRID: 1/16 Quantized</span>
            </div>
          </div>

          {/* Card 2: Harmonic Architecture */}
          <div className="rounded-xl border border-white/10 bg-pit/70 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="kicker text-amber">02 · HARMONIC FOUNDATION</span>
              <span className="font-mono text-[10px] text-cyanx font-bold">{key}</span>
            </div>
            <h4 className="font-bold text-sm text-ink">{romanChords}</h4>
            <p className="text-dim text-[11px] leading-relaxed">
              Rooted in <strong>{key}</strong> with a cyclical progression archetype. Chords utilize extended 7ths and suspended 4ths to create emotional tension before resolving into the chorus hook.
            </p>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-faint">
              <span>Dominant Cadence: V → i</span>
              <span className="text-cyanx font-bold">Camelot: {harmonics?.camelot || "3A"}</span>
            </div>
          </div>

          {/* Card 3: Dynamic Arc */}
          <div className="rounded-xl border border-white/10 bg-pit/70 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="kicker text-mint">03 · DYNAMIC & ENERGY ARC</span>
              <span className="font-mono text-[10px] text-mint font-bold">Δ {dynamicRange}</span>
            </div>
            <h4 className="font-bold text-sm text-ink">Commercial Loudness Target</h4>
            <p className="text-dim text-[11px] leading-relaxed">
              Energy progression transitions from a sparse <strong>45% energy intro</strong> to an explosive <strong>92% peak chorus drop</strong>, providing high dynamic contrast optimized for streaming normalization.
            </p>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-faint">
              <span>RMS Mean: {energy ? `${Math.round(energy.avg * 100)}%` : "72%"}</span>
              <span className="text-amber font-bold">Drop Impact: High</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: DAW Remake Recipe & Mix Presets */}
      {activeTab === "recipe" && (
        <div className="mt-5 flex flex-col gap-4">
          <div className="rounded-xl border border-amber/30 bg-amber/[0.04] p-4 text-[11.5px] leading-relaxed text-ink/90 flex flex-col gap-3">
            <div className="flex items-center justify-between font-bold text-amber text-xs uppercase tracking-wider border-b border-amber/20 pb-2">
              <div className="flex items-center gap-2">
                <span>🎛️</span> Step-by-Step FL Studio & Ableton Remake Blueprint
              </div>
              <button
                type="button"
                onClick={() => {
                  const sheetText = `=====================================================
AI PRODUCER SUITE // DAW REMAKE BLUEPRINT
TRACK: ${meta.title} (${meta.artist || "Unknown Artist"})
=====================================================
TEMPO: ${bpm} BPM
KEY: ${key}
CHORD PROGRESSION: ${romanChords}
DOMINANT INSTRUMENT: ${dominantFamily}
DYNAMIC RANGE: ${dynamicRange}

1. PROJECT INITIALIZATION
   - Set DAW Master Tempo: ${bpm} BPM
   - Project Scale: ${key}

2. LOW-END & DRUM PROGRAMMING
   - 808 Root: ${key.split(" ")[0]}1 (35 - 65 Hz)
   - Kick Pattern: Beats 1 & 3 with syncopated 16th ghost hits
   - Snare/Clap: Beats 2 & 4 (Steps 5 & 13)
   - Hi-Hats: 16th notes with 1/32 triplet rolls leading into bar downbeats

3. HARMONIC & KEYS ENGINE
   - Instrument: Felt Piano / Vintage Rhodes
   - Voicing: ${romanChords} in Octaves 3 & 4
   - Mix: High-pass at 180 Hz, notch at 400 Hz for vocal pocket

4. MIX & MASTER CHAIN TARGETS
   - FabFilter Saturn / Tape Saturation on 808
   - Sidechain Kick -> 808 (-4 dB gain reduction, 45ms release)
   - Master Limiting Target: -8 to -9 LUFS
=====================================================`;
                  const blob = new Blob([sheetText], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${meta.title || "track"}-daw-blueprint.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-2.5 py-1 rounded bg-amber text-black font-black hover:bg-white transition cursor-pointer text-[10px] shadow-sm"
              >
                ⬇ DOWNLOAD DAW SETUP SHEET (.TXT)
              </button>
            </div>

            <ol className="flex flex-col gap-2.5 pl-4 list-decimal text-dim">
              <li>
                <strong className="text-ink">Step 1: Set Project Tempo & Key</strong> — Set DAW tempo to <span className="text-amber font-bold">{bpm} BPM</span> and project scale to <span className="text-cyanx font-bold">{key}</span>.
              </li>
              <li>
                <strong className="text-ink">Step 2: Build the Drum & 808 Backbone</strong> — Load an 808 sub-bass sample and tune root to {key.split(" ")[0]}1. Layer a punchy kick on steps 1 & 9, snare on steps 5 & 13, and 16th-note closed hi-hats with velocity rolls leading into downbeats.
              </li>
              <li>
                <strong className="text-ink">Step 3: Lay the Chord Progression</strong> — Program the <span className="text-amber font-bold">{romanChords}</span> chords on a warm Rhodes or Felt Piano in octave 3/4. Use 7th extensions for lush depth.
              </li>
              <li>
                <strong className="text-ink">Step 4: Sound Design the Lead Synth & Hook</strong> — Layer a dual-sawtooth lead synth with a lowpass cutoff envelope (800 Hz &rarr; 3 kHz) and 1/8-note ping-pong delay.
              </li>
              <li>
                <strong className="text-ink">Step 5: Structure the Dynamic Build</strong> — Strip drums in the Intro (bars 1-8), introduce bass & vocals in Verse (bars 9-24), add riser FX in pre-chorus, and unleash full instrumentation in Chorus (bar 25+).
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Tab 3: Stem Arrangement Matrix */}
      {activeTab === "stems" && (
        <div className="mt-5 flex flex-col gap-3">
          <div className="rounded-xl border border-white/10 bg-pit/70 p-4">
            <h4 className="font-bold text-xs text-cyanx uppercase tracking-wider mb-3">
              Section-by-Section Instrumentation Layering
            </h4>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(sections.length > 0
                ? sections
                : [
                    { label: "Intro", start: 0, end: 15, avgEnergy: 0.45, tier: "guessed" as const },
                    { label: "Verse 1", start: 15, end: 45, avgEnergy: 0.65, tier: "guessed" as const },
                    { label: "Chorus", start: 45, end: 85, avgEnergy: 0.92, tier: "guessed" as const },
                    { label: "Outro", start: 85, end: 110, avgEnergy: 0.48, tier: "guessed" as const },
                  ]
              ).map((sec, idx) => (
                <div key={idx} className="rounded-lg border border-white/10 bg-[#0d111a] p-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber text-xs uppercase">[{sec.label}]</span>
                    <span className="font-mono text-[10px] text-faint">{sec.start}s – {sec.end}s</span>
                  </div>
                  <p className="text-[11px] text-dim leading-snug">
                    {sec.label.toLowerCase().includes("intro")
                      ? "Keys, ambient pads, soft vocal chop swell"
                      : sec.label.toLowerCase().includes("chorus")
                      ? "Full drums, 808 sub, lead vocal, synth hook, strings"
                      : sec.label.toLowerCase().includes("verse")
                      ? "Kick, snare, hi-hats, 808 bass, lead vocal"
                      : "Filtered beat, fading keys, reverberant outro tail"}
                  </p>
                  <div className="mt-1 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9.5px] text-faint">
                    <span>Energy: {Math.round(sec.avgEnergy * 100)}%</span>
                    <span className="text-mint font-semibold">Active Layers: 6-8</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Interactive Ask AI Producer */}
      {activeTab === "ask" && (
        <div className="mt-5 flex flex-col gap-3">
          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleAskAi(p)}
                className="rounded-full border border-cyanx/30 bg-cyanx/10 px-3 py-1 font-mono text-[10px] font-bold text-cyanx hover:bg-cyanx hover:text-black transition cursor-pointer"
              >
                💡 {p}
              </button>
            ))}
          </div>

          {/* AI Chat History */}
          <div className="rounded-xl border border-white/10 bg-[#07090e] p-4 max-h-72 overflow-y-auto flex flex-col gap-3">
            {aiChatLog.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-lg p-3 text-[11.5px] leading-relaxed flex flex-col gap-1 ${
                  msg.role === "user"
                    ? "bg-cyanx/15 border border-cyanx/40 text-ink self-end max-w-[85%]"
                    : "bg-white/[0.03] border border-white/10 text-dim self-start max-w-[95%]"
                }`}
              >
                <span className="font-mono text-[9.5px] font-black uppercase tracking-wider text-amber">
                  {msg.role === "user" ? "YOU" : "AI PRODUCER BOT"}
                </span>
                <div className="whitespace-pre-line text-ink">{msg.text}</div>
              </div>
            ))}

            {isAiThinking && (
              <div className="rounded-lg p-3 bg-white/[0.03] border border-white/10 text-amber font-mono text-xs flex items-center gap-2 self-start animate-pulse">
                <span>🧠</span> Analyzing musical stems and computing synthesis formula...
              </div>
            )}
          </div>

          {/* User Input Bar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskAi()}
              placeholder="Ask how to mix, program drums, or sound design this track..."
              className="flex-1 rounded-xl border border-white/15 bg-pit px-4 py-2.5 font-mono text-xs text-ink placeholder:text-faint focus:border-amber focus:outline-none"
            />
            <button
              onClick={() => handleAskAi()}
              className="rounded-xl bg-amber px-5 py-2.5 font-mono text-xs font-black text-black hover:bg-amber/90 transition shadow-md shadow-amber/30 cursor-pointer"
            >
              ASK AI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
