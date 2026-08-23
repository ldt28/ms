/**
 * Signal — Granular Audio Pattern Recognition & Polyphonic Step Sequencer Engine.
 *
 * 1. Fully separates discrete drum & percussion elements (Kick, 808, Snare, Clap, Closed Hat, Triplet Rolls, Open Hat, Perc/Rim, 808 Glides).
 * 2. Provides exact Musical Notes & Chord Progressions on active steps for Piano, Keys, 808, and Synth leads.
 * 3. Real-time Polyphonic WebAudio Synthesizer with note-pitch & chord playback.
 */

import type { ChannelPattern, ReportData } from "./types";

export interface ChannelTemplateDef {
  id: string;
  num: string;
  name: string;
  category: "all" | "drums" | "chords" | "synths" | "strings";
  color: string;
  glow: string;
  pan: number;
  vol: number;
  family: string;
  description: string;
}

export const GRANULAR_CHANNELS: ChannelTemplateDef[] = [
  // --- 1. DRUMS & PERCUSSION MATRIX ---
  {
    id: "kick_drum",
    num: "01",
    name: "Kick Drum (Punch)",
    category: "drums",
    color: "#ff3366",
    glow: "rgba(255, 51, 102, 0.8)",
    pan: 0,
    vol: 94,
    family: "drums",
    description: "Punchy acoustic/electronic transient kick body (55–90 Hz)",
  },
  {
    id: "sub_808",
    num: "02",
    name: "808 Tuned Sub-Bass",
    category: "drums",
    color: "#00f0ff",
    glow: "rgba(0, 240, 255, 0.8)",
    pan: 0,
    vol: 96,
    family: "bass",
    description: "Deep saturated 808 sub-bass fundamental with musical tuning",
  },
  {
    id: "snare_acoustic",
    num: "03",
    name: "Snare Drum",
    category: "drums",
    color: "#ff9900",
    glow: "rgba(255, 153, 0, 0.8)",
    pan: 0,
    vol: 88,
    family: "drums",
    description: "Wood/metallic core backbeat on beats 2 & 4",
  },
  {
    id: "clap_stereo",
    num: "04",
    name: "Hand Clap",
    category: "drums",
    color: "#ffaa00",
    glow: "rgba(255, 170, 0, 0.8)",
    pan: 5,
    vol: 86,
    family: "drums",
    description: "Wide stereo snap layered with the snare",
  },
  {
    id: "hihat_closed",
    num: "05",
    name: "Closed Hi-Hat",
    category: "drums",
    color: "#00e5ff",
    glow: "rgba(0, 229, 255, 0.8)",
    pan: -15,
    vol: 80,
    family: "drums",
    description: "Continuous 16th-note rhythmic driving cadence",
  },
  {
    id: "hihat_triplet",
    num: "06",
    name: "Hi-Hat Triplet Rolls",
    category: "drums",
    color: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.8)",
    pan: 15,
    vol: 76,
    family: "drums",
    description: "Fast 1/32 trap rolls and stutter velocity dips",
  },
  {
    id: "open_hat",
    num: "07",
    name: "Open Hi-Hat",
    category: "drums",
    color: "#ffcc00",
    glow: "rgba(255, 204, 0, 0.8)",
    pan: -20,
    vol: 74,
    family: "drums",
    description: "Syncopated off-beat sizzle on the 'and' of beats",
  },
  {
    id: "perc_rim",
    num: "08",
    name: "Perc & Rimshot",
    category: "drums",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.8)",
    pan: 20,
    vol: 72,
    family: "drums",
    description: "Organic woodblocks, rim clicks, and shaker accents",
  },
  {
    id: "sub_glide",
    num: "09",
    name: "808 Pitch Slides",
    category: "chords",
    color: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.8)",
    pan: 0,
    vol: 92,
    family: "bass",
    description: "Octave pitch slides and melodic 808 transition sweeps",
  },

  // --- 2. HARMONIC & KEYS ENGINE ---
  {
    id: "piano_chords",
    num: "10",
    name: "Felt Piano Chords",
    category: "chords",
    color: "#b026ff",
    glow: "rgba(176, 38, 255, 0.8)",
    pan: -15,
    vol: 84,
    family: "keys",
    description: "Dark felt grand piano harmonic progression chords",
  },
  {
    id: "rhodes_keys",
    num: "11",
    name: "Electric Keys / Rhodes",
    category: "chords",
    color: "#d1c4e9",
    glow: "rgba(209, 196, 233, 0.8)",
    pan: 15,
    vol: 78,
    family: "keys",
    description: "Warm 7th and 9th modal jazz chord voicings",
  },

  // --- 3. SYNTHS, LEADS & ARPEGGIOS ---
  {
    id: "hook_lead",
    num: "12",
    name: "Hook Lead Synth",
    category: "synths",
    color: "#00ff9d",
    glow: "rgba(0, 255, 157, 0.8)",
    pan: 0,
    vol: 90,
    family: "synths",
    description: "Topline vocal-style lead synth with portamento",
  },
  {
    id: "arp_pluck",
    num: "13",
    name: "Pluck Arpeggiator",
    category: "synths",
    color: "#18ffff",
    glow: "rgba(24, 255, 255, 0.8)",
    pan: -25,
    vol: 76,
    family: "synths",
    description: "16th-note syncopated melodic pluck counter-point",
  },

  // --- 4. VOCALS & AD-LIBS ---
  {
    id: "lead_vocal",
    num: "14",
    name: "Lead Vocal Track",
    category: "all",
    color: "#ff007f",
    glow: "rgba(255, 0, 127, 0.8)",
    pan: 0,
    vol: 94,
    family: "vocals",
    description: "Main melodic and rhythmic vocal flow cadence",
  },
  {
    id: "adlibs_tags",
    num: "15",
    name: "Ad-Libs & Tags",
    category: "all",
    color: "#ec4899",
    glow: "rgba(236, 72, 153, 0.8)",
    pan: 30,
    vol: 82,
    family: "vocals",
    description: "Quavo ad-libs, producer shouts, and vocal echoes",
  },

  // --- 5. STRINGS & TRANSITION FX ---
  {
    id: "strings_pad",
    num: "16",
    name: "Orchestral Strings",
    category: "strings",
    color: "#ffd54f",
    glow: "rgba(255, 213, 79, 0.8)",
    pan: 0,
    vol: 75,
    family: "strings",
    description: "Emotive background violin/cello sustained pads",
  },
  {
    id: "fx_riser",
    num: "17",
    name: "Riser & Impact FX",
    category: "strings",
    color: "#ff6e40",
    glow: "rgba(255, 110, 64, 0.8)",
    pan: 0,
    vol: 82,
    family: "strings",
    description: "White noise risers, downlifters, and crash drops",
  },
];

/**
 * Generate Musical Chord Progressions based on detected key
 */
function getChordsForKey(keyStr: string): { i: string; VI: string; iv: string; V: string; notes: string[] } {
  const norm = keyStr.toLowerCase();
  if (norm.includes("f minor") || norm.includes("fm") || norm.includes("f min")) {
    return { i: "Fm", VI: "Dbmaj7", iv: "Bbm7", V: "C7", notes: ["F", "Ab", "C", "Eb"] };
  }
  if (norm.includes("c minor") || norm.includes("cm")) {
    return { i: "Cm", VI: "Abmaj7", iv: "Fm7", V: "G7", notes: ["C", "Eb", "G", "Bb"] };
  }
  if (norm.includes("a minor") || norm.includes("am")) {
    return { i: "Am", VI: "Fmaj7", iv: "Dm7", V: "E7", notes: ["A", "C", "E", "G"] };
  }
  if (norm.includes("d minor") || norm.includes("dm")) {
    return { i: "Dm", VI: "Bbmaj7", iv: "Gm7", V: "A7", notes: ["D", "F", "A", "C"] };
  }
  if (norm.includes("g minor") || norm.includes("gm")) {
    return { i: "Gm", VI: "Ebmaj7", iv: "Cm7", V: "D7", notes: ["G", "Bb", "D", "F"] };
  }
  if (norm.includes("e minor") || norm.includes("em")) {
    return { i: "Em", VI: "Cmaj7", iv: "Am7", V: "B7", notes: ["E", "G", "B", "D"] };
  }
  // Default to B minor / Aeolian
  return { i: "Bbm", VI: "Gbmaj7", iv: "Ebm7", V: "F7", notes: ["Bb", "Db", "F", "Ab"] };
}

/**
 * Derives section-specific step patterns with exact Musical Notes for each channel.
 */
export function generateDynamicPatterns(report?: Partial<ReportData> | null): Record<string, ChannelPattern[]> {
  const keySig = report?.keySig?.value || "F minor";
  const chords = getChordsForKey(keySig);
  const rootNote = keySig.split(" ")[0] || "F";

  const buildPattern = (secName: "Intro" | "Verse" | "Chorus" | "Bridge" | "Outro"): ChannelPattern[] => {
    return GRANULAR_CHANNELS.map((ch) => {
      let steps: boolean[] = [];
      let stepNotes: (string | null)[] = Array(16).fill(null);

      switch (ch.id) {
        case "kick_drum":
          if (secName === "Intro" || secName === "Outro") {
            steps = [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
          } else if (secName === "Chorus") {
            // High-energy 4-on-the-floor trap punch
            steps = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
          } else {
            // Syncopated trap kick
            steps = [true, false, false, false, false, false, true, false, true, false, false, false, false, true, false, false];
          }
          break;

        case "sub_808":
          if (secName === "Intro") {
            steps = Array(16).fill(false);
          } else if (secName === "Chorus") {
            steps = [true, false, false, true, false, false, true, false, true, false, false, true, false, true, false, false];
            stepNotes[0] = `${rootNote}1`;
            stepNotes[3] = `${rootNote}1`;
            stepNotes[6] = "Db1";
            stepNotes[8] = `${rootNote}1`;
            stepNotes[11] = "C1";
            stepNotes[13] = "Ab1";
          } else {
            steps = [true, false, false, false, false, false, true, false, true, false, false, false, false, false, true, false];
            stepNotes[0] = `${rootNote}1`;
            stepNotes[6] = "Db1";
            stepNotes[8] = `${rootNote}1`;
            stepNotes[14] = "C1";
          }
          break;

        case "snare_acoustic":
          if (secName === "Intro" || secName === "Outro") {
            steps = Array(16).fill(false);
          } else {
            // Backbeat on beats 2 & 4 (steps 5 & 13)
            steps = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
          }
          break;

        case "clap_stereo":
          if (secName === "Intro") {
            steps = Array(16).fill(false);
          } else if (secName === "Chorus") {
            // Layered with snare + ghost snap on 16
            steps = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, true];
          } else {
            steps = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
          }
          break;

        case "hihat_closed":
          if (secName === "Intro") {
            steps = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
          } else if (secName === "Bridge") {
            steps = [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false];
          } else {
            // Full 16th-note groove
            steps = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true];
          }
          break;

        case "hihat_triplet":
          if (secName === "Chorus") {
            // Triplets leading into beat 2, 3, 4
            steps = [false, false, true, true, false, false, false, true, false, false, true, true, false, true, true, true];
          } else if (secName === "Verse") {
            steps = [false, false, false, false, false, false, true, true, false, false, false, false, false, false, true, true];
          } else {
            steps = Array(16).fill(false);
          }
          break;

        case "open_hat":
          if (secName === "Chorus") {
            steps = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
          } else if (secName === "Verse") {
            steps = [false, false, true, false, false, false, false, false, false, false, true, false, false, false, false, false];
          } else {
            steps = Array(16).fill(false);
          }
          break;

        case "perc_rim":
          if (secName === "Verse" || secName === "Chorus") {
            steps = [false, true, false, false, false, true, false, false, false, true, false, false, true, false, false, false];
          } else {
            steps = Array(16).fill(false);
          }
          break;

        case "sub_glide":
          if (secName === "Chorus") {
            steps = [false, false, false, true, false, false, false, false, false, false, false, true, false, false, false, false];
            stepNotes[3] = `${rootNote}1➔Ab1`;
            stepNotes[11] = "Db1➔C1";
          } else {
            steps = Array(16).fill(false);
          }
          break;

        case "piano_chords":
          steps = [true, false, false, false, false, false, true, false, false, false, true, false, false, false, false, false];
          stepNotes[0] = chords.i;
          stepNotes[6] = chords.VI;
          stepNotes[10] = chords.iv;
          break;

        case "rhodes_keys":
          if (secName === "Intro" || secName === "Verse") {
            steps = [false, true, false, false, true, false, false, true, false, true, false, false, true, false, false, true];
            stepNotes[1] = `${chords.i}7`;
            stepNotes[4] = `${chords.VI}`;
            stepNotes[7] = `${chords.iv}`;
            stepNotes[12] = `${chords.V}`;
          } else {
            steps = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
            stepNotes[4] = chords.VI;
            stepNotes[12] = chords.V;
          }
          break;

        case "hook_lead":
          if (secName === "Chorus") {
            steps = [true, false, true, true, false, true, true, false, true, true, false, true, false, true, true, false];
            stepNotes[0] = `${chords.notes[0]}5`;
            stepNotes[2] = `${chords.notes[1]}5`;
            stepNotes[3] = `${chords.notes[2]}5`;
            stepNotes[5] = `${chords.notes[3]}5`;
            stepNotes[6] = `${chords.notes[0]}5`;
            stepNotes[8] = `${chords.notes[2]}5`;
            stepNotes[9] = `${chords.notes[1]}5`;
            stepNotes[11] = `${chords.notes[0]}5`;
          } else {
            steps = Array(16).fill(false);
          }
          break;

        case "arp_pluck":
          if (secName === "Chorus" || secName === "Verse") {
            steps = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true];
            for (let i = 0; i < 16; i++) {
              stepNotes[i] = `${chords.notes[i % 4]}4`;
            }
          } else {
            steps = Array(16).fill(false);
          }
          break;

        case "lead_vocal":
          if (secName === "Intro") {
            steps = [true, true, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
            stepNotes[0] = "Vocal Swell";
          } else if (secName === "Verse" || secName === "Chorus") {
            steps = [true, true, true, false, true, true, false, true, true, true, true, false, true, false, true, false];
            stepNotes[0] = "Cadence";
            stepNotes[4] = "Flow";
            stepNotes[8] = "Rhyme";
          } else {
            steps = Array(16).fill(false);
          }
          break;

        case "adlibs_tags":
          if (secName === "Intro") {
            steps = [true, true, true, true, false, false, false, false, false, false, false, false, false, false, false, false];
            stepNotes[0] = "Maneesh!";
          } else if (secName === "Chorus" || secName === "Verse") {
            steps = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
            stepNotes[4] = "Shabang!";
            stepNotes[12] = "Skrrt!";
          } else {
            steps = Array(16).fill(false);
          }
          break;

        case "strings_pad":
          if (secName === "Chorus" || secName === "Intro" || secName === "Bridge") {
            steps = [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
            stepNotes[0] = `${chords.i} Pad`;
            stepNotes[8] = `${chords.VI} Pad`;
          } else {
            steps = Array(16).fill(false);
          }
          break;

        case "fx_riser":
          if (secName === "Bridge" || secName === "Intro") {
            steps = [false, false, false, false, false, false, false, false, false, false, false, false, true, true, true, true];
            stepNotes[12] = "Riser ➔";
          } else if (secName === "Chorus") {
            steps = [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
            stepNotes[0] = "Impact Crash";
          } else {
            steps = Array(16).fill(false);
          }
          break;

        default:
          steps = Array(16).fill(false);
      }

      return {
        ...ch,
        steps,
        stepNotes,
      };
    });
  };

  return {
    Intro: buildPattern("Intro"),
    Verse: buildPattern("Verse"),
    Chorus: buildPattern("Chorus"),
    Bridge: buildPattern("Bridge"),
    Outro: buildPattern("Outro"),
  };
}

/**
 * WebAudio Polyphonic Synthesizer with note-pitch rendering.
 */
let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
    void sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

export function playAuditionSound(channelId: string, noteName?: string | null) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  try {
    switch (channelId) {
      case "kick_drum": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.09);
        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.23);
        break;
      }

      case "sub_808":
      case "sub_glide": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        const rootFreq = noteName?.includes("Db") ? 34.65 : noteName?.includes("C") ? 32.7 : 43.65; // F1
        osc.frequency.setValueAtTime(rootFreq * 2, now);
        if (channelId === "sub_glide") {
          osc.frequency.exponentialRampToValueAtTime(rootFreq * 3.5, now + 0.25);
        } else {
          osc.frequency.exponentialRampToValueAtTime(rootFreq, now + 0.05);
        }
        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.46);
        break;
      }

      case "snare_acoustic": {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(185, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.07);
        oscGain.gain.setValueAtTime(0.7, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);

        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.setValueAtTime(1200, now);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        break;
      }

      case "clap_stereo": {
        for (let offset = 0; offset < 3; offset++) {
          const t = now + offset * 0.012;
          const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.09, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuffer;
          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(1500, t);
          filter.Q.setValueAtTime(2.5, t);
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(offset === 2 ? 0.9 : 0.4, t);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(ctx.destination);
          noise.start(t);
        }
        break;
      }

      case "hihat_closed":
      case "hihat_triplet": {
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.045, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.setValueAtTime(7500, now);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(channelId === "hihat_triplet" ? 0.45 : 0.6, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        break;
      }

      case "open_hat": {
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.setValueAtTime(6000, now);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.55, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        break;
      }

      case "piano_chords":
      case "rhodes_keys": {
        // Polyphonic triad chord synthesis
        const chordFreqs = channelId === "piano_chords" ? [174.61, 207.65, 261.63] : [261.63, 311.13, 392.0];
        chordFreqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = channelId === "piano_chords" ? "triangle" : "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.01);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.01);
          osc.stop(now + 0.62);
        });
        break;
      }

      case "hook_lead":
      case "arp_pluck": {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(349.23, now); // F4
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2500, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.2);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
        break;
      }

      default: {
        // Subtle soft click fallback
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      }
    }
  } catch {
    // Ignore audio interruption
  }
}
