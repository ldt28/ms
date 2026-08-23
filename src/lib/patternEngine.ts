/**
 * Signal — Audio Pattern Recognition & Step Sequencer Engine.
 *
 * 1. Derives 16-step channel patterns per section from audio DSP features (tempo, onsets, texture, energy).
 * 2. Provides WebAudio real-time synthesis for instant pad auditioning and playback clicks.
 */

import type { ChannelPattern, ReportData } from "./types";

export const CHANNEL_TEMPLATES = [
  {
    id: "kick_808",
    num: "01",
    name: "Kick & 808",
    category: "drums" as const,
    color: "#ff3366",
    glow: "rgba(255, 51, 102, 0.7)",
    pan: 0,
    vol: 92,
    family: "drums",
    description: "4-on-the-floor / Trap sub punch on beats 1 & 3",
  },
  {
    id: "snare_clap",
    num: "02",
    name: "Snare & Clap",
    category: "drums" as const,
    color: "#ffaa00",
    glow: "rgba(255, 170, 0, 0.7)",
    pan: 0,
    vol: 86,
    family: "drums",
    description: "Main backbeat on beats 2 & 4 (steps 5 & 13)",
  },
  {
    id: "hihat_roll",
    num: "03",
    name: "Hi-Hat Rolls",
    category: "drums" as const,
    color: "#00f0ff",
    glow: "rgba(0, 240, 255, 0.7)",
    pan: 15,
    vol: 78,
    family: "drums",
    description: "16th-note division with triplet velocity rolls",
  },
  {
    id: "perc_open",
    num: "04",
    name: "Open Hat & Perc",
    category: "drums" as const,
    color: "#ffcc00",
    glow: "rgba(255, 204, 0, 0.7)",
    pan: -15,
    vol: 72,
    family: "drums",
    description: "Syncopated off-beat groove accents (steps 3, 7, 11, 15)",
  },
  {
    id: "sub_bass",
    num: "05",
    name: "Sub-Bass & Slides",
    category: "chords" as const,
    color: "#00f0ff",
    glow: "rgba(0, 240, 255, 0.7)",
    pan: 0,
    vol: 94,
    family: "bass",
    description: "Diatonic root bassline with 808 glides",
  },
  {
    id: "piano_chords",
    num: "06",
    name: "Piano Progression",
    category: "chords" as const,
    color: "#b026ff",
    glow: "rgba(176, 38, 255, 0.7)",
    pan: -20,
    vol: 82,
    family: "keys",
    description: "Triad & 7th harmonic progression loop",
  },
  {
    id: "rhodes_keys",
    num: "07",
    name: "Electric Keys",
    category: "chords" as const,
    color: "#d1c4e9",
    glow: "rgba(209, 196, 233, 0.7)",
    pan: 20,
    vol: 76,
    family: "keys",
    description: "Warm syncopated chord stabs & color extensions",
  },
  {
    id: "hook_lead",
    num: "08",
    name: "Hook Lead Synth",
    category: "synths" as const,
    color: "#00ff9d",
    glow: "rgba(0, 255, 157, 0.7)",
    pan: 0,
    vol: 88,
    family: "synths",
    description: "Topline chorus melody earworm",
  },
  {
    id: "arp_pluck",
    num: "09",
    name: "Pluck Arpeggiator",
    category: "synths" as const,
    color: "#18ffff",
    glow: "rgba(24, 255, 255, 0.7)",
    pan: -30,
    vol: 76,
    family: "synths",
    description: "1/16 rhythmic counter-melody",
  },
  {
    id: "lead_vocal",
    num: "10",
    name: "Lead Vocal Track",
    category: "all" as const,
    color: "#ff007f",
    glow: "rgba(255, 0, 127, 0.7)",
    pan: 0,
    vol: 92,
    family: "vocals",
    description: "Center-panned vocal cadence & syllable rhythm",
  },
  {
    id: "strings_pad",
    num: "11",
    name: "Orchestral Strings",
    category: "strings" as const,
    color: "#ffd54f",
    glow: "rgba(255, 213, 79, 0.7)",
    pan: 0,
    vol: 74,
    family: "strings",
    description: "Sustained emotional background swells",
  },
  {
    id: "fx_riser",
    num: "12",
    name: "Riser & Impact FX",
    category: "strings" as const,
    color: "#ff6e40",
    glow: "rgba(255, 110, 64, 0.7)",
    pan: 0,
    vol: 80,
    family: "strings",
    description: "Tension build-up & transition drops",
  },
];

/**
 * Generates dynamic 16-step patterns for all channels across all song sections.
 */
export function generateDynamicPatterns(report: Partial<ReportData>): Record<string, ChannelPattern[]> {
  const tempoBpm = report.tempo?.value ?? 120;
  const isFastTempo = tempoBpm >= 135;
  const onsetRate = report.texture?.onsetRate?.value ?? 3.5;

  // Derive specialized step patterns for each section archetype
  return {
    // 1. INTRO
    Intro: CHANNEL_TEMPLATES.map((tmpl) => {
      let steps = Array(16).fill(false);
      if (tmpl.id === "piano_chords") steps = [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
      if (tmpl.id === "rhodes_keys") steps = [false, false, true, false, false, false, false, false, false, false, true, false, false, false, false, false];
      if (tmpl.id === "arp_pluck") steps = [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false];
      if (tmpl.id === "strings_pad") steps = [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
      if (tmpl.id === "fx_riser") steps = [false, false, false, false, false, false, false, false, false, false, false, false, true, true, true, true];
      return { ...tmpl, steps };
    }),

    // 2. VERSE
    Verse: CHANNEL_TEMPLATES.map((tmpl) => {
      let steps = Array(16).fill(false);
      if (tmpl.id === "kick_808") {
        steps = isFastTempo
          ? [true, false, false, false, false, false, true, false, false, false, true, false, false, false, false, false]
          : [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
      } else if (tmpl.id === "snare_clap") {
        steps = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
      } else if (tmpl.id === "hihat_roll") {
        steps = onsetRate > 4
          ? [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true]
          : [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false];
      } else if (tmpl.id === "perc_open") {
        steps = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
      } else if (tmpl.id === "sub_bass") {
        steps = [true, false, false, false, false, true, false, false, true, false, false, false, false, true, false, false];
      } else if (tmpl.id === "piano_chords") {
        steps = [true, false, false, false, false, false, true, false, false, false, true, false, false, false, false, false];
      } else if (tmpl.id === "rhodes_keys") {
        steps = [false, true, false, false, true, false, false, true, false, true, false, false, true, false, false, true];
      } else if (tmpl.id === "lead_vocal") {
        steps = [true, true, true, false, true, true, false, true, true, true, false, true, true, false, true, false];
      }
      return { ...tmpl, steps };
    }),

    // 3. CHORUS / HOOK
    Chorus: CHANNEL_TEMPLATES.map((tmpl) => {
      let steps = Array(16).fill(false);
      if (tmpl.id === "kick_808") {
        steps = isFastTempo
          ? [true, false, false, true, false, false, true, false, true, false, false, true, false, false, true, false]
          : [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
      } else if (tmpl.id === "snare_clap") {
        steps = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
      } else if (tmpl.id === "hihat_roll") {
        steps = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true];
      } else if (tmpl.id === "perc_open") {
        steps = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, true];
      } else if (tmpl.id === "sub_bass") {
        steps = [true, false, true, false, false, true, false, true, true, false, true, false, false, true, false, true];
      } else if (tmpl.id === "piano_chords") {
        steps = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
      } else if (tmpl.id === "rhodes_keys") {
        steps = [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false];
      } else if (tmpl.id === "hook_lead") {
        steps = [true, false, true, true, false, true, true, false, true, true, false, true, false, true, true, false];
      } else if (tmpl.id === "arp_pluck") {
        steps = [true, true, false, true, true, false, true, true, false, true, true, false, true, true, true, true];
      } else if (tmpl.id === "lead_vocal") {
        steps = [true, true, true, true, false, true, true, true, true, true, true, true, false, true, true, true];
      } else if (tmpl.id === "strings_pad") {
        steps = [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
      } else if (tmpl.id === "fx_riser") {
        steps = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, true];
      }
      return { ...tmpl, steps };
    }),

    // 4. BRIDGE
    Bridge: CHANNEL_TEMPLATES.map((tmpl) => {
      let steps = Array(16).fill(false);
      if (tmpl.id === "snare_clap") steps = [false, false, false, false, false, false, false, false, false, false, false, false, true, true, true, true];
      if (tmpl.id === "hihat_roll") steps = [true, false, true, false, true, false, true, false, true, true, true, true, true, true, true, true];
      if (tmpl.id === "sub_bass") steps = [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
      if (tmpl.id === "piano_chords") steps = [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
      if (tmpl.id === "strings_pad") steps = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
      if (tmpl.id === "fx_riser") steps = [false, false, false, false, false, false, false, false, true, true, true, true, true, true, true, true];
      if (tmpl.id === "lead_vocal") steps = [true, false, false, true, false, false, true, false, false, true, false, false, true, false, true, false];
      return { ...tmpl, steps };
    }),

    // 5. OUTRO
    Outro: CHANNEL_TEMPLATES.map((tmpl) => {
      let steps = Array(16).fill(false);
      if (tmpl.id === "kick_808") steps = [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
      if (tmpl.id === "snare_clap") steps = [false, false, false, false, true, false, false, false, false, false, false, false, false, false, false, false];
      if (tmpl.id === "hihat_roll") steps = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
      if (tmpl.id === "piano_chords") steps = [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
      if (tmpl.id === "rhodes_keys") steps = [false, false, true, false, false, false, false, false, false, false, true, false, false, false, false, false];
      if (tmpl.id === "strings_pad") steps = [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
      return { ...tmpl, steps };
    }),
  };
}

// ---------------------------------------------------------------------------
// Real-time WebAudio Synthesizer for FL Studio Channel Rack Audition
// ---------------------------------------------------------------------------
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AC: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function playAuditionSound(channelId: string): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (channelId) {
      case "kick_808": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }

      case "snare_clap": {
        const bufferSize = ctx.sampleRate * 0.18;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 1200;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.18);
        break;
      }

      case "hihat_roll": {
        const bufferSize = ctx.sampleRate * 0.04;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 8500;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.04);
        break;
      }

      case "perc_open": {
        const bufferSize = ctx.sampleRate * 0.25;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 6500;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.25);
        break;
      }

      case "sub_bass": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(55, now);

        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }

      case "piano_chords":
      case "rhodes_keys": {
        [220, 277.18, 329.63].forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.4);
        });
        break;
      }

      case "hook_lead":
      case "arp_pluck": {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(440, now);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 0.25);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      default: {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    }
  } catch {
    // AudioContext suspended or not yet interacted
  }
}
