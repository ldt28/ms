import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReportData } from "../lib/types";
import {
  CARD_THEMES,
  copyCanvasToClipboard,
  downloadCanvasImage,
  downloadJsonReport,
  downloadMarkdownReport,
  drawSocialCard,
  generateMarkdownReport,
  getShareSnippet,
  type CardAspect,
  type CardTheme,
} from "../lib/exportUtils";
import confetti from "canvas-confetti";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportData;
}

type TabKey = "card" | "pdf" | "markdown" | "json" | "snippet";

export function ExportModal({ isOpen, onClose, report }: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("card");
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>("cyber");
  const [selectedAspect, setSelectedAspect] = useState<CardAspect>("landscape");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redraw canvas whenever theme, aspect ratio, or report changes
  useEffect(() => {
    if (activeTab === "card" && canvasRef.current) {
      drawSocialCard(canvasRef.current, report, selectedTheme, selectedAspect);
    }
  }, [activeTab, selectedTheme, selectedAspect, report]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showCopyToast = (msg: string) => {
    setCopyStatus(msg);
    setTimeout(() => setCopyStatus(null), 2500);
  };

  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    const cleanTitle = (report.meta.title || "signal_track").toLowerCase().replace(/[^a-z0-9]+/g, "_");
    downloadCanvasImage(canvasRef.current, `${cleanTitle}_social_card.png`);
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    const success = await copyCanvasToClipboard(canvasRef.current);
    if (success) {
      showCopyToast("Image copied to clipboard!");
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.8 } });
    } else {
      showCopyToast("Clipboard access unavailable — downloaded instead.");
      handleDownloadImage();
    }
  };

  const handleCopyMarkdown = async () => {
    const md = generateMarkdownReport(report);
    await navigator.clipboard.writeText(md);
    showCopyToast("Markdown copied to clipboard!");
  };

  const handleCopyJson = async () => {
    const jsonStr = JSON.stringify(report, null, 2);
    await navigator.clipboard.writeText(jsonStr);
    showCopyToast("JSON data copied to clipboard!");
  };

  const handleCopySnippet = async () => {
    const snippet = getShareSnippet(report);
    await navigator.clipboard.writeText(snippet);
    showCopyToast("Quick summary copied to clipboard!");
    confetti({ particleCount: 20, spread: 45, origin: { y: 0.8 } });
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const markdownContent = generateMarkdownReport(report);
  const jsonContent = JSON.stringify(report, null, 2);
  const snippetContent = getShareSnippet(report);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-linesoft bg-surface shadow-2xl shadow-black/80">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-linesoft px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyanx/30 bg-cyanx/10 text-cyanx font-mono font-bold text-base">
              ⤹
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Export & Share Report</h2>
              <p className="text-xs text-dim">
                {report.meta.title || "Untitled"} · {report.tempo.value ? `${report.tempo.value} BPM` : "Analyzed Track"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-linesoft text-dim transition hover:border-line hover:text-ink"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-linesoft bg-pit/50 px-6 py-1.5 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab("card")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-mono text-xs font-semibold transition ${
              activeTab === "card"
                ? "bg-cyanx/15 text-cyanx border border-cyanx/40 shadow-sm"
                : "text-dim hover:text-ink hover:bg-pit"
            }`}
          >
            📸 Social Card
          </button>
          <button
            onClick={() => setActiveTab("pdf")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-mono text-xs font-semibold transition ${
              activeTab === "pdf"
                ? "bg-cyanx/15 text-cyanx border border-cyanx/40 shadow-sm"
                : "text-dim hover:text-ink hover:bg-pit"
            }`}
          >
            🖨️ PDF & Print
          </button>
          <button
            onClick={() => setActiveTab("markdown")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-mono text-xs font-semibold transition ${
              activeTab === "markdown"
                ? "bg-cyanx/15 text-cyanx border border-cyanx/40 shadow-sm"
                : "text-dim hover:text-ink hover:bg-pit"
            }`}
          >
            📝 Markdown
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-mono text-xs font-semibold transition ${
              activeTab === "json"
                ? "bg-cyanx/15 text-cyanx border border-cyanx/40 shadow-sm"
                : "text-dim hover:text-ink hover:bg-pit"
            }`}
          >
            📦 JSON Data
          </button>
          <button
            onClick={() => setActiveTab("snippet")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-mono text-xs font-semibold transition ${
              activeTab === "snippet"
                ? "bg-cyanx/15 text-cyanx border border-cyanx/40 shadow-sm"
                : "text-dim hover:text-ink hover:bg-pit"
            }`}
          >
            💬 Quick Snippet
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 1. SOCIAL CARD TAB */}
          {activeTab === "card" && (
            <div className="flex flex-col gap-6">
              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-linesoft bg-pit/70 p-4">
                {/* Theme Selector */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-dim">Theme:</span>
                  <div className="flex gap-1.5">
                    {(Object.keys(CARD_THEMES) as CardTheme[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTheme(t)}
                        className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition ${
                          selectedTheme === t
                            ? "border-cyanx bg-cyanx/20 text-cyanx font-bold"
                            : "border-linesoft bg-surface text-dim hover:text-ink"
                        }`}
                      >
                        {CARD_THEMES[t].name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio Selector */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-dim">Format:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setSelectedAspect("landscape")}
                      className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition ${
                        selectedAspect === "landscape"
                          ? "border-cyanx bg-cyanx/20 text-cyanx font-bold"
                          : "border-linesoft bg-surface text-dim hover:text-ink"
                      }`}
                    >
                      Landscape (1200×630)
                    </button>
                    <button
                      onClick={() => setSelectedAspect("square")}
                      className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition ${
                        selectedAspect === "square"
                          ? "border-cyanx bg-cyanx/20 text-cyanx font-bold"
                          : "border-linesoft bg-surface text-dim hover:text-ink"
                      }`}
                    >
                      Square (1080×1080)
                    </button>
                  </div>
                </div>
              </div>

              {/* Canvas Preview */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-linesoft bg-black/40 p-4 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="max-h-[380px] w-auto max-w-full rounded-lg shadow-xl border border-linesoft"
                  style={{
                    aspectRatio: selectedAspect === "landscape" ? "1200 / 630" : "1 / 1",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-xs text-faint">
                  High-DPI 2x image ready for Twitter, Discord, Instagram, and OpenGraph.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyImage}
                    className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 font-mono text-xs font-bold text-ink transition hover:border-cyanx hover:text-cyanx"
                  >
                    📋 Copy Image
                  </button>
                  <button
                    onClick={handleDownloadImage}
                    className="flex items-center gap-2 rounded-lg bg-cyanx px-5 py-2.5 font-mono text-xs font-bold text-black transition hover:bg-cyanx/90 shadow-md shadow-cyanx/20"
                  >
                    ⬇ Download PNG
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. PDF & PRINT TAB */}
          {activeTab === "pdf" && (
            <div className="flex flex-col gap-5">
              <div className="rounded-xl border border-cyanx/30 bg-cyanx/8 p-5">
                <h3 className="font-display text-base font-bold text-cyanx">Printable Audio Report</h3>
                <p className="mt-1 text-sm text-dim leading-relaxed">
                  Export a publication-ready PDF summary of this track. The print stylesheet automatically hides UI
                  buttons, navigation bars, and formats all musical findings, energy graphs, and section boundaries into a clean document.
                </p>
              </div>

              <div className="rounded-xl border border-linesoft bg-pit p-5 flex flex-col gap-3">
                <h4 className="font-mono text-xs font-bold text-ink tracking-wider uppercase">What gets included in your PDF:</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-dim font-mono">
                  <li className="flex items-center gap-2">✓ Verified BPM & Key Signatures</li>
                  <li className="flex items-center gap-2">✓ Exact Song Section Timings</li>
                  <li className="flex items-center gap-2">✓ Dynamic Range & Peak Levels</li>
                  <li className="flex items-center gap-2">✓ Spectral Texture & Brightness</li>
                  <li className="flex items-center gap-2">✓ Lyrics & Hook Repetitions</li>
                  <li className="flex items-center gap-2">✓ Full DSP Provenance Tally</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handlePrintPdf}
                  className="flex items-center gap-2 rounded-lg bg-cyanx px-6 py-3 font-mono text-xs font-bold text-black transition hover:bg-cyanx/90 shadow-lg shadow-cyanx/20"
                >
                  🖨️ Open Print & Save as PDF
                </button>
              </div>
            </div>
          )}

          {/* 3. MARKDOWN TAB */}
          {activeTab === "markdown" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-dim">
                  Formatted GitHub Markdown for Obsidian, Notion, GitHub, and research notes.
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="rounded-lg border border-line bg-surface px-3.5 py-1.5 font-mono text-xs font-bold text-ink transition hover:border-cyanx hover:text-cyanx"
                  >
                    📋 Copy Markdown
                  </button>
                  <button
                    onClick={() => downloadMarkdownReport(report)}
                    className="rounded-lg bg-cyanx px-4 py-1.5 font-mono text-xs font-bold text-black transition hover:bg-cyanx/90"
                  >
                    ⬇ Download .md
                  </button>
                </div>
              </div>

              <pre className="max-h-[380px] overflow-y-auto rounded-xl border border-linesoft bg-pit p-4 font-mono text-xs text-dim leading-relaxed whitespace-pre-wrap select-all">
                {markdownContent}
              </pre>
            </div>
          )}

          {/* 4. JSON DATA TAB */}
          {activeTab === "json" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-dim">
                  Full machine-readable data payload with raw DSP timestamps and tiers.
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="rounded-lg border border-line bg-surface px-3.5 py-1.5 font-mono text-xs font-bold text-ink transition hover:border-cyanx hover:text-cyanx"
                  >
                    📋 Copy JSON
                  </button>
                  <button
                    onClick={() => downloadJsonReport(report)}
                    className="rounded-lg bg-cyanx px-4 py-1.5 font-mono text-xs font-bold text-black transition hover:bg-cyanx/90"
                  >
                    ⬇ Download .json
                  </button>
                </div>
              </div>

              <pre className="max-h-[380px] overflow-y-auto rounded-xl border border-linesoft bg-pit p-4 font-mono text-xs text-dim leading-relaxed whitespace-pre-wrap select-all">
                {jsonContent}
              </pre>
            </div>
          )}

          {/* 5. QUICK SNIPPET TAB */}
          {activeTab === "snippet" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-linesoft bg-pit p-5 flex flex-col gap-3">
                <span className="font-mono text-xs text-dim">
                  Compact summary ready to paste into Discord, Twitter, Slack, or Reddit:
                </span>
                <div className="rounded-lg border border-linesoft bg-surface p-4 font-mono text-sm text-ink leading-relaxed whitespace-pre-wrap">
                  {snippetContent}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCopySnippet}
                  className="flex items-center gap-2 rounded-lg bg-cyanx px-6 py-2.5 font-mono text-xs font-bold text-black transition hover:bg-cyanx/90 shadow-md shadow-cyanx/20"
                >
                  📋 Copy Summary Snippet
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Toast Notification */}
        {copyStatus && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-cyanx/50 bg-pit/95 px-5 py-2 font-mono text-xs font-bold text-cyanx shadow-2xl backdrop-blur-md animate-bounce">
            ✨ {copyStatus}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
