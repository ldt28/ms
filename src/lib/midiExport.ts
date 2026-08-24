// Standard MIDI File (SMF Type 0) Binary Generator for FL Studio & Ableton export
import type { ChannelPattern } from "./types";

// General MIDI Drum Note Mapping
const DRUM_MIDI_MAP: Record<string, number> = {
  kick_punch: 36, // C1 (Bass Drum 1)
  sub_808: 35, // B0 (Acoustic Bass Drum)
  snare_acoustic: 38, // D1 (Acoustic Snare)
  clap_snap: 39, // D#1 (Hand Clap)
  hat_closed: 42, // F#1 (Closed Hi-Hat)
  hat_triplet_rolls: 44, // G#1 (Pedal Hi-Hat)
  hat_open: 46, // A#1 (Open Hi-Hat)
  perc_rim: 37, // C#1 (Side Stick / Rimshot)
  slide_808: 41, // F1 (Low Floor Tom / Glide)
  piano_chords: 65, // F4
  rhodes_keys: 68, // G#4
  lead_synth: 72, // C5
  pluck_arp: 77, // F5
  vocal_lead: 60, // C4
  vocal_adlib: 63, // D#4
  strings_orchestral: 53, // F3
  riser_fx: 80, // G#5
};

function writeVarLen(val: number): number[] {
  const buffer: number[] = [];
  buffer.push(val & 0x7f);
  while ((val >>= 7)) {
    buffer.unshift((val & 0x7f) | 0x80);
  }
  return buffer;
}

export function exportChannelsToMidi(
  channels: ChannelPattern[],
  bpm: number = 132,
  trackName: string = "Pattern"
): Uint8Array {
  const ticksPerQuarter = 96; // Standard PPQ
  const ticksPerStep = ticksPerQuarter / 4; // 16th note = 24 ticks

  const trackEvents: number[] = [];

  // Track Name Meta Event
  const trackNameBytes = Array.from(new TextEncoder().encode(trackName));
  trackEvents.push(0x00, 0xff, 0x03, trackNameBytes.length, ...trackNameBytes);

  // Set Tempo Meta Event (microseconds per quarter note)
  const mpqn = Math.round(60000000 / (bpm || 120));
  trackEvents.push(
    0x00,
    0xff,
    0x51,
    0x03,
    (mpqn >> 16) & 0xff,
    (mpqn >> 8) & 0xff,
    mpqn & 0xff
  );

  // Collect all Note On and Note Off events sorted by tick
  interface MidiEvent {
    tick: number;
    type: "on" | "off";
    note: number;
    vel: number;
    channel: number;
  }

  const events: MidiEvent[] = [];

  channels.forEach((ch, chIdx) => {
    const isDrum = ch.category === "drums" || ch.id.includes("kick") || ch.id.includes("snare") || ch.id.includes("hat");
    const midiChannel = isDrum ? 9 : Math.min(15, chIdx % 16); // Channel 10 (0-indexed 9) is standard GM Drum Channel
    const baseNote = DRUM_MIDI_MAP[ch.id] || 60; // Middle C default

    ch.steps.forEach((isActive, stepIdx) => {
      if (!isActive) return;
      const startTick = stepIdx * ticksPerStep;
      const durationTicks = Math.max(12, Math.floor(ticksPerStep * 0.85)); // 85% gate length
      const endTick = startTick + durationTicks;

      events.push({
        tick: startTick,
        type: "on",
        note: baseNote,
        vel: Math.round(ch.vol),
        channel: midiChannel,
      });

      events.push({
        tick: endTick,
        type: "off",
        note: baseNote,
        vel: 0,
        channel: midiChannel,
      });
    });
  });

  // Sort events by tick (with "off" events before "on" if at same tick)
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    return a.type === "off" ? -1 : 1;
  });

  // Convert to Delta Times & MIDI byte stream
  let lastTick = 0;
  events.forEach((ev) => {
    const delta = ev.tick - lastTick;
    lastTick = ev.tick;

    trackEvents.push(...writeVarLen(delta));
    if (ev.type === "on") {
      trackEvents.push(0x90 | (ev.channel & 0x0f), ev.note, ev.vel);
    } else {
      trackEvents.push(0x80 | (ev.channel & 0x0f), ev.note, 0x00);
    }
  });

  // End of Track Meta Event
  trackEvents.push(0x00, 0xff, 0x2f, 0x00);

  // MThd Header Chunk (SMF Type 0, 1 Track, 96 PPQ)
  const header = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // Chunk length (6 bytes)
    0x00, 0x00,             // Format 0
    0x00, 0x01,             // 1 Track
    (ticksPerQuarter >> 8) & 0xff,
    ticksPerQuarter & 0xff, // PPQ
  ];

  // MTrk Track Chunk
  const trackLen = trackEvents.length;
  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    (trackLen >> 24) & 0xff,
    (trackLen >> 16) & 0xff,
    (trackLen >> 8) & 0xff,
    trackLen & 0xff,
  ];

  return new Uint8Array([...header, ...trackHeader, ...trackEvents]);
}
