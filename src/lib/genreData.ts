import { generateDemoAudioFile } from "./demoTracks";

export interface ChordProgressionBlueprint {
  roman: string; // e.g. "i – VI – III – VII"
  chords: string[]; // e.g. ["Bbm", "Gb", "Db", "Ab"]
  description: string;
  exampleHits: string[];
}

export interface SubgenreInfo {
  id: string;
  name: string;
  bpmRange: string; // e.g. "120 – 128 BPM"
  avgBpm: number;
  timeSignature: string;
  grooveFeel: string; // e.g. "Driving straight 16ths with sidechained kick"
  signatureProgressions: ChordProgressionBlueprint[];
  structure: {
    sections: string[]; // e.g. ["Intro (8b)", "Verse 1 (16b)", "Pre-Chorus (8b)", "Chorus (16b)", ...]
    pacingRule: string;
  };
  instruments: {
    rhythm: string[];
    bass: string[];
    harmony: string[];
    leads: string[];
    vocals: string[];
  };
  lyricThemes: {
    themes: string[];
    rhymeDensityTarget: string;
    vocalProcessing: string;
  };
  mixStandards: {
    targetLufs: string; // e.g. "-8 to -6 LUFS"
    dynamicRange: string; // e.g. "6 – 9 dB"
    subBassRule: string;
    highEndRule: string;
    mixTip: string;
  };
  demoStyle: "synthwave" | "lofi" | "pop";
  demoTitle: string;
  demoArtist: string;
  demoLyrics: string;
}

export interface GenreFamily {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  color: string;
  bgGlow: string;
  subgenres: SubgenreInfo[];
}

export const GENRE_FAMILIES: GenreFamily[] = [
  {
    id: "pop",
    name: "Pop & Dance",
    icon: "⚡",
    tagline: "Anthemic hooks, driving four-on-the-floor, and polished vocal perfection",
    color: "#f0a63f",
    bgGlow: "rgba(240, 166, 63, 0.15)",
    subgenres: [
      {
        id: "synthpop",
        name: "80s Retro Synthpop",
        bpmRange: "115 – 130 BPM",
        avgBpm: 122,
        timeSignature: "4/4",
        grooveFeel: "Pulsing 16th-note analog bass arpeggios with gated 80s snare",
        signatureProgressions: [
          {
            roman: "i – VI – III – VII",
            chords: ["Bbm", "Gb", "Db", "Ab"],
            description: "The quintessential dark-emotional minor dance progression.",
            exampleHits: ["Blinding Lights (The Weeknd)", "Sweet Dreams (Eurythmics)"],
          },
          {
            roman: "I – V – vi – IV",
            chords: ["F", "C", "Dm", "Bb"],
            description: "The universal uplifting pop hook progression.",
            exampleHits: ["As It Was (Harry Styles)", "Save Your Tears (The Weeknd)"],
          },
        ],
        structure: {
          sections: ["Intro (4b)", "Verse 1 (8b)", "Pre-Chorus (8b)", "Chorus (16b)", "Verse 2 (8b)", "Chorus (16b)", "Bridge / Solo (8b)", "Final Chorus (16b)", "Outro (8b)"],
          pacingRule: "The hook MUST arrive before the 0:55 second mark with maximum dynamic lift (+25% energy).",
        },
        instruments: {
          rhythm: ["LinnDrum & Roland TR-707 Kick", "Gated Reverb Snare (500Hz body)", "16th-note closed hi-hats"],
          bass: ["Roland Juno-106 Arpeggiated Sawtooth Bass", "Moog Sub 37 sub-bass octave layer"],
          harmony: ["Sequential Prophet-5 warm poly-pads", "Yamaha DX7 bell electric pianos"],
          leads: ["Oberheim OB-Xa bright brass stabs", "Roland Jupiter-8 arpeggio leads"],
          vocals: ["Lush stereo doubled vocals", "1/8th dotted delay with plate reverb"],
        },
        lyricThemes: {
          themes: ["Late-night highway escapism", "Nostalgic romance", "Heartbreak under neon city lights"],
          rhymeDensityTarget: "35% – 45% (AABB / ABAB rhyming couplets)",
          vocalProcessing: "Crisp top-end air boost (>10kHz), subtle tape saturation, and tuned formant doubling.",
        },
        mixStandards: {
          targetLufs: "-8.5 to -7.0 LUFS (Commercial Streaming)",
          dynamicRange: "8 – 11 dB",
          subBassRule: "Mono below 100 Hz. Sidechain bass to kick with fast 25ms release.",
          highEndRule: "Silky shimmer shelf at 12 kHz; de-ess harsh sibilance at 6.5 kHz.",
          mixTip: "Carve out 300–450 Hz in the master pad buss to leave pristine headroom for the lead vocal.",
        },
        demoStyle: "synthwave",
        demoTitle: "Midnight Velocity",
        demoArtist: "Cyberwave Allstars",
        demoLyrics: `Neon skyline burning bright,
Driving through the velvet night.
Lost in the electric glow,
Nowhere left for us to go.

And ooh, the city comes alive,
We were born to just survive!
Through the shadows, through the rain,
We will never be the same!`,
      },
      {
        id: "dance-pop",
        name: "Modern Dance-Pop",
        bpmRange: "120 – 128 BPM",
        avgBpm: 124,
        timeSignature: "4/4",
        grooveFeel: "Punchy four-on-the-floor kick with bouncing offbeat open hi-hats",
        signatureProgressions: [
          {
            roman: "vi – IV – I – V",
            chords: ["Am", "F", "C", "G"],
            description: "High-energy club anthem loop with relentless emotional momentum.",
            exampleHits: ["Levitating (Dua Lipa)", "Poker Face (Lady Gaga)"],
          },
        ],
        structure: {
          sections: ["Intro (4b)", "Verse 1 (8b)", "Pre-Chorus (8b)", "Chorus / Drop (16b)", "Verse 2 (8b)", "Chorus / Drop (16b)", "Bridge (8b)", "Final Chorus (16b)"],
          pacingRule: "Tight 2-bar pre-chorus risers with high-pass filter sweep into explosive drop.",
        },
        instruments: {
          rhythm: ["Punchy 909 Dance Kick", "Clap layered with finger-snap", "Offbeat 909 open hats"],
          bass: ["Serum FM pluck bass", "Saturated sub-sine 808 layer"],
          harmony: ["Pitched vocal chops", "M1 House piano chords"],
          leads: ["Wide supersaw chord stacks", "Detuned plucks with tape delay"],
          vocals: ["Ultra-compressed forward lead vocal", "Pitch-shifted octave vocal doubles"],
        },
        lyricThemes: {
          themes: ["Celebration", "Magnetic attraction on the dancefloor", "Empowerment & confidence"],
          rhymeDensityTarget: "40% – 50%",
          vocalProcessing: "Hard auto-tune with fast attack (0-10ms), sidechain ducking under the kick drum.",
        },
        mixStandards: {
          targetLufs: "-7.5 to -6.0 LUFS",
          dynamicRange: "7 – 9 dB",
          subBassRule: "Kick fundamental centered at 55 Hz; bass ducks -3dB on every kick hit.",
          highEndRule: "Bright and energetic high end with subtle stereo imaging above 8 kHz.",
          mixTip: "Use parallel drum smash compression (1176 All-Buttons-In) mixed in at 15%.",
        },
        demoStyle: "pop",
        demoTitle: "Electric Hearts",
        demoArtist: "Nova Pop",
        demoLyrics: `Feel the rhythm in my chest,
Leaving all the past behind.
Tonight we're putting to the test,
The magic that we're gonna find!

Dance with me under the lights,
We're taking over all the nights!`,
      },
    ],
  },
  {
    id: "hiphop",
    name: "Hip-Hop & Trap",
    icon: "🎤",
    tagline: "Rolling 808 glides, lightning triplet hi-hats, and rhythmic verbal cadences",
    color: "#ff5e7e",
    bgGlow: "rgba(255, 94, 126, 0.15)",
    subgenres: [
      {
        id: "trap",
        name: "Modern Trap / Drill",
        bpmRange: "130 – 165 BPM (Half-time 65–82)",
        avgBpm: 140,
        timeSignature: "4/4",
        grooveFeel: "Half-time snare on beat 3 with 32nd-note rolling triplet hi-hats and gliding 808s",
        signatureProgressions: [
          {
            roman: "i – VI (2-Chord Tension Loop)",
            chords: ["Bbm", "Gb"],
            description: "Minimalist dark tension allowing maximum space for 808 melodies and vocals.",
            exampleHits: ["Paint The Town Red (Doja Cat)", "Sicko Mode (Travis Scott)"],
          },
          {
            roman: "i – v – VI – v",
            chords: ["Fm", "Cm", "Db", "Cm"],
            description: "Melodic drill chord loop with emotional minor tonality.",
            exampleHits: ["Dior (Pop Smoke)", "Lucid Dreams (Juice WRLD)"],
          },
        ],
        structure: {
          sections: ["Intro (4b)", "Chorus / Hook (8b)", "Verse 1 (16b)", "Chorus (8b)", "Verse 2 (16b)", "Chorus (8b)", "Outro (4b)"],
          pacingRule: "Hook-first structure common in streaming; drops directly into 808 groove at 0:15.",
        },
        instruments: {
          rhythm: ["Tight acoustic-sampled snare or punchy rimshot", "Pitch-shifting triplet hi-hat rolls", "Woody percussion clacks"],
          bass: ["Saturated Spinz 808 with portamento glide", "Hard-clipped sub frequencies"],
          harmony: ["Half-speed reversed piano loop", "Dark bell plucks with vintage chorus"],
          leads: ["Distorted flute synth", "Filtered minor vocal chops"],
          vocals: ["Dry center lead vocal", "Wide panned ad-libs with heavy reverb/delay throws"],
        },
        lyricThemes: {
          themes: ["Overcoming odds", "Ambition & relentless hustle", "Street loyalty & nocturnal lifestyle"],
          rhymeDensityTarget: "50% – 70% (Internal multi-syllabic rhymes)",
          vocalProcessing: "Aggressive compression (Opto + VCA), boosted 3kHz bite, heavy tuning.",
        },
        mixStandards: {
          targetLufs: "-8.0 to -6.5 LUFS",
          dynamicRange: "6 – 8 dB",
          subBassRule: "808 carries energy down to 32 Hz. Soft-clip master buss for maximum perceived punch.",
          highEndRule: "Crisp hi-hats with slight roll-off above 16 kHz to avoid ear fatigue.",
          mixTip: "Cut out low frequencies (<150Hz) completely from melody instruments to give the 808 unobstructed headroom.",
        },
        demoStyle: "synthwave",
        demoTitle: "No Compromise",
        demoArtist: "Street Beat Collective",
        demoLyrics: `Step in the room and they all look around,
Never back down when we holding the crown.
Grinding all night till the sun coming up,
Stacking the chips and we never get stuck.

Yeah we run it, yeah we do it,
Through the storm we pushing through it!`,
      },
      {
        id: "lofi-hiphop",
        name: "Chillhop & Lo-Fi Beats",
        bpmRange: "70 – 90 BPM",
        avgBpm: 80,
        timeSignature: "4/4",
        grooveFeel: "Laidback unquantized swing with vinyl crackle and tape wow/flutter",
        signatureProgressions: [
          {
            roman: "ii9 – V13 – Imaj7 – VI7",
            chords: ["Dm9", "G13", "Cmaj7", "A7"],
            description: "Classic jazz turnaround with lush 4-note extended harmonies.",
            exampleHits: ["Coffee (beabadoobee)", "Get You (Daniel Caesar)"],
          },
        ],
        structure: {
          sections: ["Intro (4b)", "Groove A (16b)", "Melody Variation (8b)", "Groove B (16b)", "Outro (8b)"],
          pacingRule: "Hypnotic, seamless looping structure designed for study and focus playlists.",
        },
        instruments: {
          rhythm: ["Dusty vinyl drum break", "Muffled kick with 120Hz warmth", "Shaker loop with relaxed swing"],
          bass: ["Warm upright acoustic bass or filtered round sub"],
          harmony: ["Fender Rhodes Mark I electric piano with vinyl pitch wobble", "Nylon acoustic guitar strums"],
          leads: ["Muted trumpet with warm tape delay", "Rain & cafe ambient field recordings"],
          vocals: ["Low-pass filtered vocal chops or vintage movie spoken dialogue"],
        },
        lyricThemes: {
          themes: ["Nostalgia", "Cozy rainy afternoons", "Peace of mind & reflective solitude"],
          rhymeDensityTarget: "30% – 40%",
          vocalProcessing: "Bandpass telephone filter (400Hz–3.5kHz), analog tape saturation, vinyl noise blend.",
        },
        mixStandards: {
          targetLufs: "-12 to -10 LUFS",
          dynamicRange: "10 – 14 dB",
          subBassRule: "Gentle warm low-end without harsh transients.",
          highEndRule: "Steep low-pass filter at 8–10 kHz for smooth vintage warmth.",
          mixTip: "Apply subtle wow & flutter pitch modulation (0.2 Hz rate, 5 cents depth) on the master keyboard buss.",
        },
        demoStyle: "lofi",
        demoTitle: "Raindrops on Glass",
        demoArtist: "Lofi Study Session",
        demoLyrics: `Rain against the windowpane,
Washing out the quiet pain.
Cup of tea and dusty keys,
Drifting on the autumn breeze.

Time stands still when you're around,
In this peaceful quiet town.`,
      },
    ],
  },
  {
    id: "rnb",
    name: "R&B & Neo-Soul",
    icon: "🌊",
    tagline: "Lush extended 9th/11th chords, velvety vocal runs, and deep pocket grooves",
    color: "#58c7d8",
    bgGlow: "rgba(88, 199, 216, 0.15)",
    subgenres: [
      {
        id: "contemporary-rnb",
        name: "Contemporary Dark R&B",
        bpmRange: "60 – 85 BPM (or 120–170 double-time)",
        avgBpm: 72,
        timeSignature: "4/4",
        grooveFeel: "Deep sub pocket with syncopated snaps, reversed pads, and intimate vocals",
        signatureProgressions: [
          {
            roman: "i7 – iv7 – v7 – VImaj7",
            chords: ["Abm7", "Dbm7", "Ebm7", "Emaj7"],
            description: "Moody minor-7th progression with rich harmonic color.",
            exampleHits: ["Snooze (SZA)", "Kill Bill (SZA)", "Die For You (The Weeknd)"],
          },
        ],
        structure: {
          sections: ["Intro (4b)", "Verse 1 (8b)", "Chorus (8b)", "Verse 2 (8b)", "Chorus (8b)", "Bridge (8b)", "Chorus (8b)", "Outro (8b)"],
          pacingRule: "Gradual layering: Start with solo chords + vocals; introduce 808 and snare in chorus.",
        },
        instruments: {
          rhythm: ["Crisp rim-clicks", "Sparse filtered kick", "Reversed cymbal swells"],
          bass: ["Smooth gliding 808 or warm synth sub"],
          harmony: ["Filtered minor 9th Rhodes", "Lush ambient synth pads with chorus"],
          leads: ["Electric guitar single-note slides", "Vocal falsetto harmony stacks"],
          vocals: ["Intimate, close-mic lead vocal with breathy dynamic nuances", "Multi-part vocal choir harmonies"],
        },
        lyricThemes: {
          themes: ["Vulnerability & relationship tensions", "Unconditional loyalty", "Emotional intimacy"],
          rhymeDensityTarget: "35% – 50%",
          vocalProcessing: "Gentle pitch correction, rich stereo plate reverb, parallel vocal widening.",
        },
        mixStandards: {
          targetLufs: "-9.0 to -7.5 LUFS",
          dynamicRange: "9 – 12 dB",
          subBassRule: "Sub frequencies (40–80Hz) dominate low end; kick has short transient decay.",
          highEndRule: "Intimate vocal presence boosted at 4.5 kHz without harshness.",
          mixTip: "Pan backing vocal stacks hard left and right (100% L/R) while keeping the lead vocal dead center.",
        },
        demoStyle: "lofi",
        demoTitle: "Velvet Nights",
        demoArtist: "Soul Sessions",
        demoLyrics: `Whisper softly in my ear,
Take away the quiet fear.
Every breath and every touch,
Never thought I'd feel this much.

Stay right here until the dawn,
Now that all the doubts are gone.`,
      },
    ],
  },
  {
    id: "rock",
    name: "Rock & Alternative",
    icon: "🎸",
    tagline: "Overdriven tube amplifiers, live acoustic drums, and raw vocal emotion",
    color: "#45d498",
    bgGlow: "rgba(69, 212, 152, 0.15)",
    subgenres: [
      {
        id: "indie-rock",
        name: "Indie Rock / Alternative",
        bpmRange: "110 – 145 BPM",
        avgBpm: 128,
        timeSignature: "4/4",
        grooveFeel: "Driving live drum kit with jangly single-coil guitars and melodic basslines",
        signatureProgressions: [
          {
            roman: "I – V – vi – IV",
            chords: ["A", "E", "F#m", "D"],
            description: "The quintessential driving anthemic rock chord progression.",
            exampleHits: ["As It Was (Harry Styles)", "Mr. Brightside (The Killers)"],
          },
          {
            roman: "i – III – VII – IV",
            chords: ["Em", "G", "D", "A"],
            description: "Dorian-flavor rock progression with driving electric guitar rhythm.",
            exampleHits: ["Wonderwall (Oasis)", "Boulevard of Broken Dreams (Green Day)"],
          },
        ],
        structure: {
          sections: ["Intro (8b)", "Verse 1 (16b)", "Pre-Chorus (8b)", "Chorus (16b)", "Verse 2 (16b)", "Chorus (16b)", "Bridge / Guitar Solo (16b)", "Final Chorus (16b)", "Outro (8b)"],
          pacingRule: "Clean single guitar in verse ➔ Explosive wall of stereo distorted guitars in chorus.",
        },
        instruments: {
          rhythm: ["Real acoustic drum kit (Zildjian cymbals, Ludwig snare, punchy 22-inch kick)"],
          bass: ["Fender Precision Bass through an Ampeg SVT tube amplifier"],
          harmony: ["Fender Telecaster clean rhythm strums", "Gibson Les Paul overdriven power chords"],
          leads: ["Fuzz guitar riff with spring reverb", "Vintage combo organ accents"],
          vocals: ["Raw, dynamic lead vocals with natural room acoustic resonance"],
        },
        lyricThemes: {
          themes: ["Youthful rebellion", "Existential questioning", "Bittersweet nostalgia", "Romantic yearning"],
          rhymeDensityTarget: "30% – 45%",
          vocalProcessing: "Mild 1176 FET compression, analog console saturation, slapback room delay.",
        },
        mixStandards: {
          targetLufs: "-9.0 to -7.5 LUFS",
          dynamicRange: "9 – 13 dB",
          subBassRule: "Bass guitar carries low end (60–150Hz); high-pass below 35 Hz to preserve punch.",
          highEndRule: "Cymbals natural & airy at 10–14 kHz; guitars focused in the 1.5–4 kHz midrange.",
          mixTip: "Double-track rhythm guitars (take 1 hard left, take 2 hard right) for a massive stereo wall.",
        },
        demoStyle: "pop",
        demoTitle: "Electric Sunset",
        demoArtist: "The Indie Collective",
        demoLyrics: `Running through the open field,
Nothing left that we could yield.
Guitars scream across the bay,
Chasing all our doubts away.

We were wild, we were free,
Everything we're meant to be!`,
      },
    ],
  },
];
