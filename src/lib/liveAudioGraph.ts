/**
 * Live Web Audio API graph controller for real-time spectrum analysis & parametric EQ.
 */

export interface EqBands {
  bass: number; // dB (-15 .. +15) @ 100 Hz
  lowMid: number; // dB (-15 .. +15) @ 500 Hz
  vocalMid: number; // dB (-15 .. +15) @ 2500 Hz
  treble: number; // dB (-15 .. +15) @ 8000 Hz
}

export type EqPresetKey = "flat" | "bass_boost" | "vocal_iso" | "lofi" | "air_sparkle" | "radio";

export interface EqPreset {
  id: EqPresetKey;
  name: string;
  desc: string;
  icon: string;
  bands: EqBands;
}

export const EQ_PRESETS: Record<EqPresetKey, EqPreset> = {
  flat: {
    id: "flat",
    name: "Flat / Bypass",
    desc: "Unmodified original master signal",
    icon: "⚖️",
    bands: { bass: 0, lowMid: 0, vocalMid: 0, treble: 0 },
  },
  bass_boost: {
    id: "bass_boost",
    name: "Sub & Bass Boost",
    desc: "Punches up kick drum and sub-bass weight",
    icon: "🔊",
    bands: { bass: 8.5, lowMid: 2.0, vocalMid: -1.5, treble: 0 },
  },
  vocal_iso: {
    id: "vocal_iso",
    name: "Vocal Isolation",
    desc: "Cuts low rumbles and enhances lead vocals & lyrics",
    icon: "🎙️",
    bands: { bass: -14.0, lowMid: -3.0, vocalMid: 8.0, treble: -4.0 },
  },
  lofi: {
    id: "lofi",
    name: "Lo-Fi Muffle",
    desc: "Warm vintage roll-off with subdued high frequencies",
    icon: "📻",
    bands: { bass: 4.0, lowMid: 2.5, vocalMid: -6.0, treble: -15.0 },
  },
  air_sparkle: {
    id: "air_sparkle",
    name: "Air & Sparkle",
    desc: "Crisp shimmer on cymbals, synths, and acoustic presence",
    icon: "✨",
    bands: { bass: -2.0, lowMid: 0, vocalMid: 2.0, treble: 8.0 },
  },
  radio: {
    id: "radio",
    name: "AM / Transistor Radio",
    desc: "Narrow mid-focused bandpass for retro aesthetic",
    icon: "📟",
    bands: { bass: -15.0, lowMid: 6.0, vocalMid: 5.0, treble: -12.0 },
  },
};

// Store connected audio elements so we never call createMediaElementSource twice on the same element
const connectedSources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

class LiveAudioGraphController {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private lowMidFilter: BiquadFilterNode | null = null;
  private vocalMidFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private currentAudioEl: HTMLAudioElement | null = null;
  private currentBands: EqBands = { bass: 0, lowMid: 0, vocalMid: 0, treble: 0 };
  private activePreset: EqPresetKey = "flat";

  public init(audioEl: HTMLAudioElement) {
    if (this.currentAudioEl === audioEl && this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }

    this.currentAudioEl = audioEl;

    // 1. Create AudioContext if not already created
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }

    // 2. Safely get or create MediaElementAudioSourceNode
    let src = connectedSources.get(audioEl);
    if (!src) {
      src = this.ctx.createMediaElementSource(audioEl);
      connectedSources.set(audioEl, src);
    }
    this.sourceNode = src;

    // 3. Create parametric EQ filter nodes
    // Bass (Low Shelf @ 100 Hz)
    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = "lowshelf";
    this.bassFilter.frequency.value = 100;
    this.bassFilter.gain.value = this.currentBands.bass;

    // Low Mid (Peaking @ 500 Hz)
    this.lowMidFilter = this.ctx.createBiquadFilter();
    this.lowMidFilter.type = "peaking";
    this.lowMidFilter.frequency.value = 500;
    this.lowMidFilter.Q.value = 1.0;
    this.lowMidFilter.gain.value = this.currentBands.lowMid;

    // Vocal / High Mid (Peaking @ 2500 Hz)
    this.vocalMidFilter = this.ctx.createBiquadFilter();
    this.vocalMidFilter.type = "peaking";
    this.vocalMidFilter.frequency.value = 2500;
    this.vocalMidFilter.Q.value = 1.2;
    this.vocalMidFilter.gain.value = this.currentBands.vocalMid;

    // Treble (High Shelf @ 8000 Hz)
    this.trebleFilter = this.ctx.createBiquadFilter();
    this.trebleFilter.type = "highshelf";
    this.trebleFilter.frequency.value = 8000;
    this.trebleFilter.gain.value = this.currentBands.treble;

    // Master Preamp / Gain Node
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 1.0;

    // Fast 60 FPS Analyser Node
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256; // 128 frequency bins
    this.analyser.smoothingTimeConstant = 0.8;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;

    // 4. Connect the signal chain:
    // Source -> Bass -> LowMid -> VocalMid -> Treble -> Gain -> Analyser -> Destination
    try {
      this.sourceNode.disconnect();
    } catch {
      // ignore if not connected yet
    }

    this.sourceNode.connect(this.bassFilter);
    this.bassFilter.connect(this.lowMidFilter);
    this.lowMidFilter.connect(this.vocalMidFilter);
    this.vocalMidFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.gainNode);
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public ensureRunning() {
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  public setBand(band: keyof EqBands, valueDb: number) {
    const clamped = Math.max(-15, Math.min(15, valueDb));
    this.currentBands[band] = clamped;
    this.activePreset = "flat"; // custom change

    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (band === "bass" && this.bassFilter) {
      this.bassFilter.gain.setTargetAtTime(clamped, now, 0.05);
    } else if (band === "lowMid" && this.lowMidFilter) {
      this.lowMidFilter.gain.setTargetAtTime(clamped, now, 0.05);
    } else if (band === "vocalMid" && this.vocalMidFilter) {
      this.vocalMidFilter.gain.setTargetAtTime(clamped, now, 0.05);
    } else if (band === "treble" && this.trebleFilter) {
      this.trebleFilter.gain.setTargetAtTime(clamped, now, 0.05);
    }
  }

  public setBands(bands: EqBands) {
    (Object.keys(bands) as (keyof EqBands)[]).forEach((b) => {
      this.setBand(b, bands[b]);
    });
  }

  public applyPreset(presetKey: EqPresetKey) {
    const preset = EQ_PRESETS[presetKey];
    if (!preset) return;
    this.activePreset = presetKey;
    this.currentBands = { ...preset.bands };

    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.bassFilter) this.bassFilter.gain.setTargetAtTime(preset.bands.bass, now, 0.08);
    if (this.lowMidFilter) this.lowMidFilter.gain.setTargetAtTime(preset.bands.lowMid, now, 0.08);
    if (this.vocalMidFilter) this.vocalMidFilter.gain.setTargetAtTime(preset.bands.vocalMid, now, 0.08);
    if (this.trebleFilter) this.trebleFilter.gain.setTargetAtTime(preset.bands.treble, now, 0.08);
  }

  public getBands(): EqBands {
    return { ...this.currentBands };
  }

  public getActivePreset(): EqPresetKey {
    return this.activePreset;
  }

  public getFrequencyData(array: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyser) return false;
    this.analyser.getByteFrequencyData(array);
    return true;
  }

  public getTimeDomainData(array: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyser) return false;
    this.analyser.getByteTimeDomainData(array);
    return true;
  }

  public getFrequencyBinCount(): number {
    return this.analyser ? this.analyser.frequencyBinCount : 128;
  }
}

export const liveAudioGraph = new LiveAudioGraphController();
