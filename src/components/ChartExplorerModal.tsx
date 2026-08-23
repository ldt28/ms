import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BILLBOARD_HOT_100, loadChartTrackAudio, type ChartTrack } from "../lib/billboardData";

interface ChartExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (title: string, artist: string, lyrics: string, file: File) => void;
}

export function ChartExplorerModal({ isOpen, onClose, onSelectTrack }: ChartExplorerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [loadingTrackRank, setLoadingTrackRank] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const genres = ["all", "Pop", "Hip Hop", "Synthwave", "R&B"];

  const filtered = BILLBOARD_HOT_100.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.artist.toLowerCase().includes(search.toLowerCase()) ||
      t.genre.toLowerCase().includes(search.toLowerCase());

    const matchesGenre =
      selectedGenre === "all" || t.genre.toLowerCase().includes(selectedGenre.toLowerCase());

    return matchesSearch && matchesGenre;
  });

  const handleChoose = async (track: ChartTrack) => {
    setLoadingTrackRank(track.rank);
    try {
      const { file } = await loadChartTrackAudio(track);
      onSelectTrack(track.title, track.artist, track.lyrics, file);
      onClose();
    } catch (err) {
      console.error("Failed to load chart track", err);
    } finally {
      setLoadingTrackRank(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-linesoft bg-surface shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-linesoft px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber/40 bg-amber/10 text-amber font-mono font-bold text-lg">
              📊
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Billboard Hot 100 & Charts Explorer</h2>
              <p className="text-xs text-dim">1-click instant analysis on top chart hits with stems and lyrics</p>
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

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-linesoft bg-pit/50 p-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by song, artist, or genre..."
            className="input w-full sm:w-72 text-xs"
          />

          <div className="flex flex-wrap gap-1.5">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`rounded-lg border px-3 py-1 font-mono text-[11px] font-semibold transition ${
                  selectedGenre === g
                    ? "border-amber bg-amber/20 text-amber font-bold"
                    : "border-linesoft bg-surface text-dim hover:text-ink"
                }`}
              >
                {g === "all" ? "All Tracks" : g}
              </button>
            ))}
          </div>
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center font-mono text-sm text-dim">
              No tracks matched your search query.
            </div>
          ) : (
            filtered.map((track) => (
              <div
                key={track.rank}
                className="row-hover flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-linesoft bg-pit/80 p-4 transition"
              >
                {/* Left info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface font-mono text-xs font-bold text-amber">
                    #{track.rank}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display text-sm font-bold text-ink">
                        {track.title}
                      </span>
                      <span className="text-sm">{track.icon}</span>
                    </div>
                    <span className="truncate font-mono text-xs text-dim block">
                      {track.artist} · <strong className="text-cyanx">{track.genre}</strong>
                    </span>
                  </div>
                </div>

                {/* Right Badges & Load Button */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                  <div className="flex gap-1.5">
                    <span className="rounded border border-line bg-surface px-2 py-0.5 font-mono text-[10px] text-dim">
                      ⚡ {track.bpm} BPM
                    </span>
                    <span className="rounded border border-line bg-surface px-2 py-0.5 font-mono text-[10px] text-dim">
                      🎹 {track.key}
                    </span>
                  </div>

                  <button
                    onClick={() => handleChoose(track)}
                    disabled={loadingTrackRank !== null}
                    className="flex items-center gap-1.5 rounded-lg bg-amber px-3.5 py-1.5 font-mono text-xs font-bold text-black transition hover:bg-amber/90 disabled:opacity-50 cursor-pointer shadow-sm shadow-amber/20"
                  >
                    {loadingTrackRank === track.rank ? "Synthesizing..." : "Load Song ➔"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-linesoft bg-pit px-6 py-3 flex items-center justify-between font-mono text-[10px] text-faint">
          <span>Official Top Chart database · Synthesizes 16-bit 44.1kHz audio in-browser</span>
          <span>{filtered.length} songs available</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
