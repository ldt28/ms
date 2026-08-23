/**
 * 1-Click Audio Sample Presets & Client-Side WAV Synthesizer.
 * Generates authentic multi-track audio files directly in the browser (zero network downloads).
 */

export interface DemoPreset {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  key: string;
  icon: string;
  description: string;
  lyrics: string;
  durationSec: number;
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: "synthwave",
    title: "Midnight Drive",
    artist: "Neon Horizon",
    genre: "Synthwave / Cyberpunk",
    bpm: 124,
    key: "Bb minor",
    icon: "🌌",
    description: "124 BPM · Bb minor · Analog bass arpeggios, punchy kicks & lush synths",
    durationSec: 28,
    lyrics: `Cruising under neon wires,
City lights and analog fires.
Every frequency aligned,
Leaving all the noise behind.

Turn the bass up on the grid,
Just like we always did.
Feel the rhythm start to glow,
Now we lose control and go.`,
  },
  {
    id: "lofi",
    title: "Rainy Cafe",
    artist: "Lofi Dreamer",
    genre: "Lo-Fi Hip Hop",
    bpm: 82,
    key: "C minor",
    icon: "☕",
    description: "82 BPM · C minor · Warm Rhodes piano chords & relaxed boom-bap rhythm",
    durationSec: 26,
    lyrics: `Drops of water on the window glass,
Watching all the sleepy shadows pass.
Warm black coffee in a paper cup,
Never in a rush to hurry up.

Vinyl crackle softly in the room,
Washing all the afternoon in bloom.
Just a quiet melody to keep,
Before the city falls asleep.`,
  },
  {
    id: "pop",
    title: "Golden Hour",
    artist: "Solaris",
    genre: "Modern Pop Anthem",
    bpm: 118,
    key: "F major",
    icon: "☀️",
    description: "118 BPM · F major · Uplifting piano progression, pop energy & anthem chorus",
    durationSec: 24,
    lyrics: `Sunlight breaking through the cloudy sky,
We don't need a reason why.
Chasing colors on the open street,
Every step in sync with every beat.

This is our golden hour now,
We're gonna light it up somehow!
Sing it till the morning light,
Everything is feeling right.`,
  },
];

/**
 * Creates a standard 16-bit PCM WAV File from raw Float32Array channel data.
 */
function createWavFile(audioData: Float32Array, sampleRate: number, filename: string): File {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioData.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV Header
  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    const s = Math.max(-1, Math.min(1, audioData[i]));
    const pcm = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, pcm, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return new File([blob], filename, { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Synthesizes a real, musical audio track dynamically in-browser based on preset style.
 */
export async function generateDemoAudioFile(presetId: string): Promise<File> {
  const preset = DEMO_PRESETS.find((p) => p.id === presetId) || DEMO_PRESETS[0];
  const sampleRate = 44100;
  const totalSamples = Math.round(preset.durationSec * sampleRate);
  const audio = new Float32Array(totalSamples);

  const bpm = preset.bpm;
  const beatSec = 60 / bpm;
  const samplesPerBeat = Math.round(beatSec * sampleRate);

  // Pitch frequencies (Hz)
  const notes: Record<string, number> = {
    Bb1: 58.27,
    F2: 87.31,
    Gb2: 92.5,
    Ab2: 103.83,
    Bb2: 116.54,
    Db3: 138.59,
    F3: 174.61,
    Gb3: 185.0,
    Ab3: 207.65,
    Bb3: 233.08,
    Db4: 277.18,
    F4: 349.23,

    // Lo-fi C minor
    C2: 65.41,
    G2: 98.0,
    Ab2_lo: 103.83,
    Bb2_lo: 116.54,
    C3: 130.81,
    Eb3: 155.56,
    G3: 196.0,
    Bb3_lo: 233.08,
    C4: 261.63,
    Eb4: 311.13,
    G4: 392.0,

    // Pop F major
    F2_pop: 87.31,
    C3_pop: 130.81,
    D3_pop: 146.83,
    Bb2_pop: 116.54,
    F3_pop: 174.61,
    A3_pop: 220.0,
    C4_pop: 261.63,
    E4_pop: 329.63,
    F4_pop: 349.23,
    A4_pop: 440.0,
  };

  const totalBeats = Math.floor(preset.durationSec / beatSec);

  for (let b = 0; b < totalBeats; b++) {
    const beatStart = b * samplesPerBeat;
    const bar = Math.floor(b / 4);
    const beatInBar = b % 4;
    const sectionIndex = Math.floor(bar / 4); // 0=Intro, 1=Verse, 2=Chorus

    // --- 1. DRUMS ---
    // Kick Drum on beats 0 and 2 (or 4-on-the-floor for pop/synthwave)
    const isKick = preset.id === "pop" || preset.id === "synthwave" ? true : beatInBar === 0 || beatInBar === 2;
    if (isKick) {
      const kickLen = Math.round(0.22 * sampleRate);
      for (let i = 0; i < kickLen && beatStart + i < totalSamples; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 18);
        const freq = 120 * Math.exp(-t * 32) + 45;
        const s = Math.sin(2 * Math.PI * freq * t) * env * 0.48;
        audio[beatStart + i] += s;
      }
    }

    // Snare / Clap on beats 1 and 3
    if (beatInBar === 1 || beatInBar === 3) {
      const snareLen = Math.round(0.18 * sampleRate);
      for (let i = 0; i < snareLen && beatStart + i < totalSamples; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 22);
        const noise = (Math.random() * 2 - 1) * env * 0.28;
        const body = Math.sin(2 * Math.PI * 185 * t) * env * 0.18;
        audio[beatStart + i] += noise + body;
      }
    }

    // Hi-Hats (every 8th note)
    const hatLen = Math.round(0.06 * sampleRate);
    const eighthStart = beatStart + Math.round(samplesPerBeat / 2);
    [beatStart, eighthStart].forEach((hStart) => {
      for (let i = 0; i < hatLen && hStart + i < totalSamples; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 45);
        const s = (Math.random() * 2 - 1) * env * 0.08;
        audio[hStart + i] += s;
      }
    });

    // --- 2. BASSLINE & CHORDS ---
    let bassFreq = notes.Bb1;
    let chordFreqs = [notes.Bb3, notes.Db4, notes.F4];

    if (preset.id === "synthwave") {
      const prog = [notes.Bb1, notes.Gb2, notes.Db3, notes.Ab2];
      const chordProg = [
        [notes.Bb3, notes.Db4, notes.F4],
        [notes.Gb3, notes.Bb3, notes.Db4],
        [notes.Db3, notes.F3, notes.Ab3],
        [notes.Ab3, notes.C4, notes.Eb4],
      ];
      bassFreq = prog[bar % 4] || notes.Bb1;
      chordFreqs = chordProg[bar % 4] || chordProg[0];
    } else if (preset.id === "lofi") {
      const prog = [notes.C2, notes.Ab2_lo, notes.Eb3, notes.Bb2_lo];
      const chordProg = [
        [notes.C3, notes.Eb3, notes.G3, notes.Bb3_lo],
        [notes.Ab2_lo, notes.C3, notes.Eb3, notes.G3],
        [notes.Eb3, notes.G3, notes.Bb3_lo, notes.D4],
        [notes.Bb2_lo, notes.D3, notes.F3, notes.Ab3],
      ];
      bassFreq = prog[bar % 4] || notes.C2;
      chordFreqs = chordProg[bar % 4] || chordProg[0];
    } else {
      // Pop (F - C - Dm - Bb)
      const prog = [notes.F2_pop, notes.C3_pop, notes.D3_pop, notes.Bb2_pop];
      const chordProg = [
        [notes.F3_pop, notes.A3_pop, notes.C4_pop],
        [notes.C3_pop, notes.E4_pop, notes.G4],
        [notes.D3_pop, notes.F3_pop, notes.A3_pop],
        [notes.Bb2_pop, notes.D3_pop, notes.F3_pop],
      ];
      bassFreq = prog[bar % 4] || notes.F2_pop;
      chordFreqs = chordProg[bar % 4] || chordProg[0];
    }

    // Bass Synth / Sub
    const bassSamples = Math.min(samplesPerBeat, totalSamples - beatStart);
    for (let i = 0; i < bassSamples; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * (preset.id === "synthwave" ? 5 : 2.5));
      // Saw/Sine blend
      const s = (Math.sin(2 * Math.PI * bassFreq * t) + 0.3 * Math.sin(4 * Math.PI * bassFreq * t)) * env * 0.35;
      audio[beatStart + i] += s;
    }

    // Pad / Chord Synth (on every bar start or pulsating)
    if (beatInBar === 0 || sectionIndex >= 1) {
      const chordLen = Math.min(samplesPerBeat * 2, totalSamples - beatStart);
      for (let i = 0; i < chordLen; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 1.5) * (1 + 0.15 * Math.sin(2 * Math.PI * 4 * t));
        let chordSum = 0;
        for (const f of chordFreqs) {
          if (f) chordSum += Math.sin(2 * Math.PI * f * t) * 0.12;
        }
        audio[beatStart + i] += chordSum * env;
      }
    }
  }

  // Normalize overall mix to prevent clipping
  let maxAmp = 0;
  for (let i = 0; i < totalSamples; i++) {
    const abs = Math.abs(audio[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  if (maxAmp > 0.001) {
    const gain = 0.88 / maxAmp;
    for (let i = 0; i < totalSamples; i++) {
      audio[i] *= gain;
    }
  }

  const filename = `${preset.title.toLowerCase().replace(/\s+/g, "_")}_demo.wav`;
  return createWavFile(audio, sampleRate, filename);
}
