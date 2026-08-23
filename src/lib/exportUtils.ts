import type { ReportData, Section } from "./types";
import { formatTime, TIER_META } from "./types";
import { generateProducerInsights } from "./producerInsights";
import { detectInstruments } from "./instrumentEngine";

export type CardTheme = "cyber" | "obsidian" | "sunset" | "emerald";
export type CardAspect = "landscape" | "square";

export interface CardThemeConfig {
  name: string;
  bg: string;
  bgGradient: [string, string];
  panelBg: string;
  borderColor: string;
  accent: string;
  accentSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  waveformColor: string;
  waveformFill: string;
}

export const CARD_THEMES: Record<CardTheme, CardThemeConfig> = {
  cyber: {
    name: "Cyber Neon",
    bg: "#0b0f17",
    bgGradient: ["#090d16", "#0f172a"],
    panelBg: "#111827",
    borderColor: "#1e293b",
    accent: "#00f2fe",
    accentSecondary: "#4facfe",
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
    waveformColor: "#38bdf8",
    waveformFill: "rgba(56, 189, 248, 0.25)",
  },
  obsidian: {
    name: "Studio Obsidian",
    bg: "#09090b",
    bgGradient: ["#09090b", "#18181b"],
    panelBg: "#121215",
    borderColor: "#27272a",
    accent: "#f59e0b",
    accentSecondary: "#fbbf24",
    textPrimary: "#fafafa",
    textSecondary: "#a1a1aa",
    textMuted: "#71717a",
    waveformColor: "#f59e0b",
    waveformFill: "rgba(245, 158, 11, 0.22)",
  },
  sunset: {
    name: "Sunset Pulse",
    bg: "#0f0814",
    bgGradient: ["#14071c", "#240b36"],
    panelBg: "#1e0f2b",
    borderColor: "#3b1a52",
    accent: "#ff007f",
    accentSecondary: "#ff758c",
    textPrimary: "#ffffff",
    textSecondary: "#d8b4e2",
    textMuted: "#9b72aa",
    waveformColor: "#ff007f",
    waveformFill: "rgba(255, 0, 127, 0.28)",
  },
  emerald: {
    name: "Signal Emerald",
    bg: "#06120e",
    bgGradient: ["#05100c", "#0a221b"],
    panelBg: "#0d2820",
    borderColor: "#164e3f",
    accent: "#10b981",
    accentSecondary: "#34d399",
    textPrimary: "#f0fdf4",
    textSecondary: "#a7f3d0",
    textMuted: "#059669",
    waveformColor: "#10b981",
    waveformFill: "rgba(16, 185, 129, 0.25)",
  },
};

/**
 * Triggers a browser file download of text/data content.
 */
export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formats full analysis data into clean, structured Markdown.
 */
export function generateMarkdownReport(report: ReportData): string {
  const { meta, tempo, keySig, energy, texture, sections, lyrics } = report;
  const dateStr = new Date(meta.analyzedAt).toISOString().split("T")[0];

  const sectionsTable =
    sections.length > 0
      ? [
          "| # | Section | Start | End | Duration | Avg Energy | Tier |",
          "|---|---------|-------|-----|----------|------------|------|",
          ...sections.map(
            (s, i) =>
              `| ${i + 1} | **${s.label}** | ${formatTime(s.start)} | ${formatTime(s.end)} | ${formatTime(
                s.end - s.start
              )} | ${Math.round(s.avgEnergy * 100)}% | \`${s.tier.toUpperCase()}\` |`
          ),
        ].join("\n")
      : "_No section boundaries identified._";

  const hooksTable =
    lyrics && lyrics.hooks.length > 0
      ? [
          "| Repetitions | Hook Fragment |",
          "|---|---|",
          ...lyrics.hooks.map((h) => `| ×${h.count} | "${h.fragment}" |`),
        ].join("\n")
      : "_No repeated hook candidates found._";

  return `# 🎵 Audio Analysis Report: ${meta.title || "Untitled Track"}
**Artist:** ${meta.artist || "Unknown Artist"}  
**Date Analyzed:** ${dateStr}  
**Engine:** ${meta.engine === "browser" ? "In-Browser DSP (Web Audio API)" : "Signal Python Backend"}  
**Source:** ${meta.source.kind} ${meta.fileName && meta.fileName !== "—" ? `(\`${meta.fileName}\`)` : ""}

---

## ⚡ Core Musical Metrics

| Metric | Measured Value | Provenance Tier | Calculation Method / Source |
|---|---|---|---|
| **Tempo** | **${tempo.value ? `${tempo.value} BPM` : "—"}** | \`${tempo.tier.toUpperCase()}\` | ${tempo.source} |
| **Key & Scale** | **${keySig.value ?? "—"}** | \`${keySig.tier.toUpperCase()}\` | ${keySig.source} |
| **Duration** | **${meta.durationSec !== null ? formatTime(meta.durationSec) : "—"}** | \`MEASURED\` | Audio header / buffer decode |
| **Sample Rate** | **${meta.sampleRate ? `${(meta.sampleRate / 1000).toFixed(1)} kHz` : "—"}** | \`MEASURED\` | AudioContext sample rate |
| **Peak Amplitude** | **${energy ? `${Math.round(energy.peak * 100)}%` : "—"}** | \`MEASURED\` | Peak sample measurement |
| **Dynamic Range** | **${energy ? `${energy.dynamicRangeDb.toFixed(1)} dB` : "—"}** | \`MEASURED\` | Crest factor / RMS differential |

---

## 🌊 Frequency & Texture Analysis

${
  texture
    ? `
- **Bass Energy Ratio:** **${(texture.bassRatio.value! * 100).toFixed(1)}%** (\`${texture.bassRatio.tier.toUpperCase()}\`) — *${texture.bassRatio.source}*
- **Spectral Brightness:** **${texture.brightnessHz.value ? `${Math.round(texture.brightnessHz.value)} Hz` : "—"}** (\`${texture.brightnessHz.tier.toUpperCase()}\`) — *${texture.brightnessHz.source}*
- **Onset Density:** **${texture.onsetRate.value?.toFixed(2) ?? "—"} hits/sec** (\`${texture.onsetRate.tier.toUpperCase()}\`) — *${texture.onsetRate.source}*
`
    : "_Frequency texture data unavailable for this source._"
}

---

## 🎹 Harmonic Structure & Chord Progression

${
  report.harmonics
    ? `
- **Key & Scale:** **${report.harmonics.key}** (\`ESTIMATED\`)
- **Camelot Wheel Position:** **${report.harmonics.camelot}** (Relative: *${report.harmonics.relativeKey}*)
- **Primary Progression:** **${report.harmonics.progressionSummary}** (*${report.harmonics.patternArchetype ?? "Diatonic Cadence"}*)
- **Dominant Resolution:** \`${report.harmonics.dominantCadence}\`

### Section-by-Section Chord Map:
| Section | Start – End | Chords Sequence | Roman Progression |
|---|---|---|---|
${report.harmonics.sections
  .map(
    (sec) =>
      `| **${sec.sectionLabel}** | ${formatTime(sec.start)} – ${formatTime(sec.end)} | \`${sec.progression.join(
        " → "
      )}\` | \`${sec.romanProgression}\` |`
  )
  .join("\n")}
`
    : "_Harmonic chord progression unavailable._"
}

---

## ⏱️ Song Structure & Section Breakdown

${sectionsTable}

---

## 🎸 Detected Instruments & Stem Breakdown
${(() => {
  const instBreakdown = report.instruments ?? detectInstruments(report);
  const instList = instBreakdown.instruments
    .filter((i) => i.detected)
    .map((i) => `- **${i.icon} ${i.name}** (${i.confidencePct}% presence, ~${i.mixSharePct}% mix share): *${i.timbreDescription}*`)
    .join("\n");

  const matrixRows = instBreakdown.sectionMatrix
    .map((s) => `| **${s.sectionLabel}** | ${s.activeInstruments.map((id) => id.toUpperCase()).join(", ")} | ${s.layeringDescription} |`)
    .join("\n");

  return `
- **Dominant Arrangement Family:** ${instBreakdown.dominantFamily}
- **Detected Stems:** ${instBreakdown.detectedCount} of 7 active
- **Arrangement Flow:** ${instBreakdown.arrangementPacing}

### Active Instruments:
${instList}

### Section Layering Matrix:
| Section | Active Stems | Layering Pacing |
| :--- | :--- | :--- |
${matrixRows}
`;
})()}

---

## 📝 Lyrics & Rhyme Structure
${
  lyrics
    ? `
- **Source:** ${lyrics.source === "transcript" ? "Automated Whisper Vocal Transcription" : "User-supplied Lyrics"}
- **Word Count:** ${lyrics.wordCount} words (${lyrics.lineCount} lines)
- **Rhyme Density:** **${(lyrics.rhymeDensity.value! * 100).toFixed(1)}%** (\`${lyrics.rhymeDensity.tier.toUpperCase()}\`)
- **Lexical Diversity:** **${lyrics.diversity.value?.toFixed(2) ?? "—"}** (\`${lyrics.diversity.tier.toUpperCase()}\`)
- **Syllable Cadence:** **${lyrics.avgSyllPerLine.value?.toFixed(1) ?? "—"} syllables/line** (\`${lyrics.avgSyllPerLine.tier.toUpperCase()}\`)
- **Flow Velocity:** **${lyrics.flow.value ? `${lyrics.flow.value.toFixed(2)} syl/sec` : "—"}**

### Detected Hook / Chorus Repetitions:
${hooksTable}
`
    : "_No lyrics or transcript analyzed._"
}

---

## 💡 AI Producer & Mix Scorecard

${(() => {
  const insights = generateProducerInsights(report);
  return `
- **Overall Commercial Readiness:** **${insights.overallScore}/100** (*${insights.commercialVerdict}*)
- **Verse-to-Chorus Energy Lift:** **${
    insights.dynamicContrastLiftPct !== null
      ? `${insights.dynamicContrastLiftPct > 0 ? `+${insights.dynamicContrastLiftPct}` : insights.dynamicContrastLiftPct}%`
      : "—"
  }**
- **Mix & Frequency Balance:** ${insights.scores.mixBalance.score}% (${insights.scores.mixBalance.verdict})
- **Arrangement Flow:** ${insights.scores.arrangementFlow.score}% (${insights.scores.arrangementFlow.verdict})
- **Vocal & Lyric Impact:** ${insights.scores.vocalImpact.score}% (${insights.scores.vocalImpact.verdict})

### Production Strengths:
${insights.strengths.map((s) => `- ✓ ${s}`).join("\n")}

### Actionable Mix & Arrangement Recommendations:
${insights.recommendations.map((r) => `- **[${r.category}]** (${r.importance.toUpperCase()}): ${r.tip}`).join("\n")}
`;
})()}

---

## 🏷️ Provenance & Data Integrity
Signal adheres to strict data provenance rules. Every value declares its source and confidence tier:
- **MEASURED:** Direct DSP calculation from the audio signal.
- **COMPUTED:** Deterministic math on provided text.
- **ESTIMATED:** Statistical inference & template correlation.
- **GUESSED:** Heuristic pattern matching.

*Generated with [Signal Audio Breakdown Workbench](http://localhost:3000)*
`;
}

/**
 * Downloads a structured JSON export of the complete analysis.
 */
export function downloadJsonReport(report: ReportData) {
  const cleanTitle = (report.meta.title || "signal_track").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const filename = `${cleanTitle}_analysis.json`;
  const jsonStr = JSON.stringify(report, null, 2);
  downloadFile(filename, jsonStr, "application/json");
}

/**
 * Downloads a markdown document export.
 */
export function downloadMarkdownReport(report: ReportData) {
  const cleanTitle = (report.meta.title || "signal_track").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const filename = `${cleanTitle}_report.md`;
  const md = generateMarkdownReport(report);
  downloadFile(filename, md, "text/markdown");
}

/**
 * Generates a concise one-line / multi-line summary snippet for sharing on social/chat.
 */
export function getShareSnippet(report: ReportData): string {
  const { meta, tempo, keySig, energy, sections, lyrics, harmonics } = report;
  const parts: string[] = [];

  parts.push(`🎵 "${meta.title || "Untitled"}" by ${meta.artist || "Unknown Artist"}`);
  if (tempo.value) parts.push(`⚡ ${tempo.value} BPM`);
  if (keySig.value) {
    const camelotStr = harmonics?.camelot ? ` (${harmonics.camelot})` : "";
    parts.push(`🎹 Key: ${keySig.value}${camelotStr}`);
  }
  if (harmonics?.progressionSummary) parts.push(`🎼 Chords: ${harmonics.progressionSummary}`);
  if (meta.durationSec) parts.push(`⏱️ ${formatTime(meta.durationSec)}`);
  if (sections.length) parts.push(`🧩 ${sections.length} Sections`);
  if (energy) parts.push(`💥 ${energy.dynamicRangeDb.toFixed(1)}dB Dynamic Range`);
  if (lyrics?.rhymeDensity.value) parts.push(`🎙️ Rhyme: ${Math.round(lyrics.rhymeDensity.value * 100)}%`);

  return `${parts.join(" · ")}\nAnalyzed with Signal Breakdown Workbench 🔊`;
}

/**
 * Copies a canvas image directly to the user's OS clipboard.
 */
export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        resolve(true);
      } catch (err) {
        console.error("Clipboard copy failed", err);
        resolve(false);
      }
    }, "image/png");
  });
}

/**
 * Downloads a canvas rendering as a PNG image.
 */
export function downloadCanvasImage(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * High-definition Canvas renderer for Social Track Cards.
 * Draws high-fidelity cards suitable for Twitter / Instagram / Discord / OpenGraph.
 */
export function drawSocialCard(
  canvas: HTMLCanvasElement,
  report: ReportData,
  themeKey: CardTheme = "cyber",
  aspect: CardAspect = "landscape"
) {
  const theme = CARD_THEMES[themeKey] || CARD_THEMES.cyber;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Dimensions
  const width = aspect === "landscape" ? 1200 : 1080;
  const height = aspect === "landscape" ? 630 : 1080;

  canvas.width = width;
  canvas.height = height;

  const { meta, tempo, keySig, energy, texture, sections, lyrics } = report;

  // 1. Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, theme.bgGradient[0]);
  bgGrad.addColorStop(1, theme.bgGradient[1]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Grid Pattern
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Top Branding Header
  const pad = aspect === "landscape" ? 56 : 64;

  // Signal Badge
  ctx.save();
  ctx.fillStyle = theme.accent;
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(pad + 10, pad + 10, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = theme.accent;
  ctx.font = "bold 16px 'JetBrains Mono', monospace";
  ctx.letterSpacing = "2px";
  ctx.fillText("SIGNAL // AUDIO BREAKDOWN", pad + 28, pad + 16);

  ctx.fillStyle = theme.textMuted;
  ctx.font = "14px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillText(
    `ENGINE: ${meta.engine.toUpperCase()} · ${new Date(meta.analyzedAt).toLocaleDateString()}`,
    width - pad,
    pad + 16
  );
  ctx.textAlign = "left";

  // 4. Track Title & Artist
  const titleY = pad + (aspect === "landscape" ? 70 : 80);
  ctx.fillStyle = theme.textPrimary;
  ctx.font = `bold ${aspect === "landscape" ? 44 : 52}px 'Plus Jakarta Sans', sans-serif`;
  
  // Truncate title if too long
  let displayTitle = meta.title || "Untitled Track";
  if (displayTitle.length > 34) displayTitle = displayTitle.substring(0, 32) + "…";
  ctx.fillText(displayTitle, pad, titleY);

  ctx.fillStyle = theme.accentSecondary;
  ctx.font = `600 ${aspect === "landscape" ? 22 : 26}px 'Plus Jakarta Sans', sans-serif`;
  ctx.fillText(meta.artist || "Unknown Artist", pad, titleY + (aspect === "landscape" ? 34 : 40));

  // 5. Stat Metric Badges Row
  const metricsY = titleY + (aspect === "landscape" ? 72 : 90);
  const cardW = aspect === "landscape" ? 200 : 220;
  const cardH = 92;
  const cardGap = 20;

  const keyDisplay = keySig.value
    ? `${keySig.value}${report.harmonics?.camelot ? ` (${report.harmonics.camelot})` : ""}`
    : "—";

  const statItems = [
    { label: "TEMPO", val: tempo.value ? `${tempo.value} BPM` : "—", color: theme.accent },
    { label: "KEY / CAMELOT", val: keyDisplay, color: theme.accentSecondary },
    { label: "DURATION", val: meta.durationSec ? formatTime(meta.durationSec) : "—", color: theme.textPrimary },
    {
      label: "DYNAMIC RANGE",
      val: energy ? `${energy.dynamicRangeDb.toFixed(1)} dB` : "—",
      color: theme.textSecondary,
    },
  ];

  statItems.forEach((stat, i) => {
    const cx = pad + i * (cardW + cardGap);
    if (cx + cardW <= width - pad) {
      // Panel Box
      ctx.fillStyle = theme.panelBg;
      ctx.strokeStyle = theme.borderColor;
      ctx.lineWidth = 1.5;
      roundRect(ctx, cx, metricsY, cardW, cardH, 12);
      ctx.fill();
      ctx.stroke();

      // Top label
      ctx.fillStyle = theme.textMuted;
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.letterSpacing = "1.5px";
      ctx.fillText(stat.label, cx + 16, metricsY + 28);

      // Main value
      ctx.fillStyle = stat.color;
      ctx.font = "bold 24px 'JetBrains Mono', monospace";
      ctx.fillText(stat.val, cx + 16, metricsY + 65);
    }
  });

  // 6. Waveform / Energy Curve Visualizer
  const waveY = metricsY + cardH + (aspect === "landscape" ? 30 : 40);
  const waveW = width - pad * 2;
  const waveH = aspect === "landscape" ? 130 : 200;

  // Waveform container
  ctx.fillStyle = theme.panelBg;
  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 1.5;
  roundRect(ctx, pad, waveY, waveW, waveH, 14);
  ctx.fill();
  ctx.stroke();

  // Draw energy curve or simulated DSP bars
  const curve = energy?.curve && energy.curve.length > 10 ? energy.curve : generateFallbackWaveform();
  const barCount = Math.min(curve.length, 64);
  const step = waveW / barCount;
  const barW = Math.max(3, step - 4);

  ctx.save();
  ctx.shadowColor = theme.waveformColor;
  ctx.shadowBlur = 10;

  for (let i = 0; i < barCount; i++) {
    const sampleIdx = Math.floor((i / barCount) * curve.length);
    const val = Math.max(0.12, Math.min(1.0, curve[sampleIdx]));
    const barHeight = val * (waveH - 36);
    const bx = pad + i * step + 2;
    const by = waveY + waveH - 18 - barHeight;

    const barGrad = ctx.createLinearGradient(0, by, 0, by + barHeight);
    barGrad.addColorStop(0, theme.accent);
    barGrad.addColorStop(1, theme.accentSecondary);
    ctx.fillStyle = barGrad;

    roundRect(ctx, bx, by, barW, barHeight, 3);
    ctx.fill();
  }
  ctx.restore();

  // Waveform Header
  ctx.fillStyle = theme.textMuted;
  ctx.font = "bold 11px 'JetBrains Mono', monospace";
  ctx.fillText("ENERGY & DYNAMICS ENVELOPE", pad + 18, waveY + 24);

  if (energy) {
    ctx.textAlign = "right";
    ctx.fillStyle = theme.accent;
    ctx.fillText(`PEAK: ${Math.round(energy.peak * 100)}% · AVG: ${Math.round(energy.avg * 100)}%`, pad + waveW - 18, waveY + 24);
    ctx.textAlign = "left";
  }

  // 7. Section Timeline Bar
  const secY = waveY + waveH + (aspect === "landscape" ? 22 : 36);
  const secH = 34;

  if (sections.length > 0) {
    const totalDuration = meta.durationSec || sections[sections.length - 1].end || 1;
    let currX = pad;

    ctx.save();
    sections.forEach((sec, idx) => {
      const secDuration = sec.end - sec.start;
      const secWidth = Math.max(28, (secDuration / totalDuration) * waveW);
      const isLast = idx === sections.length - 1;
      const actualWidth = isLast ? pad + waveW - currX : secWidth;

      const secColor = getSectionColor(sec.label);
      ctx.fillStyle = secColor.bg;
      ctx.strokeStyle = secColor.border;
      ctx.lineWidth = 1;

      roundRect(ctx, currX, secY, actualWidth, secH, 6);
      ctx.fill();
      ctx.stroke();

      // Label text
      if (actualWidth > 42) {
        ctx.fillStyle = secColor.text;
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.fillText(sec.label.toUpperCase(), currX + 10, secY + 21);
      }

      currX += actualWidth + 3;
    });
    ctx.restore();
  }

  // 8. Square aspect ratio extras (Rhyme & Texture Panels)
  if (aspect === "square") {
    const bottomRowY = secY + secH + 40;
    const halfW = (width - pad * 2 - 20) / 2;
    const halfH = 170;

    // Left Panel: Frequency Texture
    ctx.fillStyle = theme.panelBg;
    ctx.strokeStyle = theme.borderColor;
    roundRect(ctx, pad, bottomRowY, halfW, halfH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.textMuted;
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillText("FREQUENCY TEXTURE", pad + 18, bottomRowY + 28);

    if (texture) {
      drawMeterRow(ctx, "Bass Ratio", `${(texture.bassRatio.value! * 100).toFixed(0)}%`, pad + 18, bottomRowY + 64, halfW - 36, theme);
      drawMeterRow(ctx, "Brightness", `${Math.round(texture.brightnessHz.value || 0)} Hz`, pad + 18, bottomRowY + 104, halfW - 36, theme);
      drawMeterRow(ctx, "Onset Rate", `${texture.onsetRate.value?.toFixed(1) || 0} /s`, pad + 18, bottomRowY + 144, halfW - 36, theme);
    }

    // Right Panel: Lyrics / Cadence
    const rightX = pad + halfW + 20;
    ctx.fillStyle = theme.panelBg;
    ctx.strokeStyle = theme.borderColor;
    roundRect(ctx, rightX, bottomRowY, halfW, halfH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.textMuted;
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillText("LYRIC & CADENCE STATS", rightX + 18, bottomRowY + 28);

    if (lyrics) {
      drawMeterRow(ctx, "Rhyme Density", `${Math.round(lyrics.rhymeDensity.value! * 100)}%`, rightX + 18, bottomRowY + 64, halfW - 36, theme);
      drawMeterRow(ctx, "Lexical Diversity", `${lyrics.diversity.value?.toFixed(2) || "—"}`, rightX + 18, bottomRowY + 104, halfW - 36, theme);
      drawMeterRow(ctx, "Syllables / Line", `${lyrics.avgSyllPerLine.value?.toFixed(1) || "—"}`, rightX + 18, bottomRowY + 144, halfW - 36, theme);
    } else {
      ctx.fillStyle = theme.textMuted;
      ctx.font = "13px 'JetBrains Mono', monospace";
      ctx.fillText("No lyrics analyzed", rightX + 18, bottomRowY + 70);
    }
  }

  // 9. Footer Watermark
  const footerY = height - 24;
  ctx.fillStyle = theme.textMuted;
  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.fillText("AUDIOPRECISE DSP VERIFIED · SIGNAL", pad, footerY);

  ctx.textAlign = "right";
  ctx.fillText("PRODUCED WITH SIGNAL BREAKDOWN", width - pad, footerY);
  ctx.textAlign = "left";
}

function drawMeterRow(
  ctx: CanvasRenderingContext2D,
  label: string,
  val: string,
  x: number,
  y: number,
  w: number,
  theme: CardThemeConfig
) {
  ctx.fillStyle = theme.textSecondary;
  ctx.font = "12px 'JetBrains Mono', monospace";
  ctx.fillText(label, x, y);

  ctx.textAlign = "right";
  ctx.fillStyle = theme.accent;
  ctx.font = "bold 14px 'JetBrains Mono', monospace";
  ctx.fillText(val, x + w, y);
  ctx.textAlign = "left";
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function getSectionColor(label: string): { bg: string; border: string; text: string } {
  const l = label.toLowerCase();
  if (l.includes("chorus") || l.includes("hook")) {
    return { bg: "rgba(245, 158, 11, 0.22)", border: "#f59e0b", text: "#fbbf24" };
  }
  if (l.includes("verse")) {
    return { bg: "rgba(56, 189, 248, 0.20)", border: "#38bdf8", text: "#7dd3fc" };
  }
  if (l.includes("intro")) {
    return { bg: "rgba(16, 185, 129, 0.20)", border: "#10b981", text: "#6ee7b7" };
  }
  if (l.includes("outro")) {
    return { bg: "rgba(168, 85, 247, 0.20)", border: "#a855f7", text: "#d8b4fe" };
  }
  if (l.includes("bridge") || l.includes("drop") || l.includes("solo")) {
    return { bg: "rgba(244, 63, 94, 0.22)", border: "#f43f5e", text: "#fda4af" };
  }
  return { bg: "rgba(148, 163, 184, 0.15)", border: "#64748b", text: "#cbd5e1" };
}

function generateFallbackWaveform(): number[] {
  const arr = [];
  for (let i = 0; i < 48; i++) {
    const s = Math.sin((i / 48) * Math.PI * 4);
    arr.push(Math.abs(s) * 0.7 + 0.25);
  }
  return arr;
}
