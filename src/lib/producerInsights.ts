import type { ReportData } from "./types";

export interface ScoreCategory {
  score: number; // 0..100
  label: string;
  verdict: string;
  color: string;
}

export interface Recommendation {
  category: "Mix & Master" | "Arrangement & Pacing" | "Vocals & Lyrics";
  tip: string;
  importance: "high" | "medium" | "tip";
}

export interface ProducerInsights {
  overallScore: number; // 0..100
  commercialVerdict: string;
  dynamicContrastLiftPct: number | null; // e.g. +28%
  chorusArrivalTimeSec: number | null;
  scores: {
    mixBalance: ScoreCategory;
    arrangementFlow: ScoreCategory;
    vocalImpact: ScoreCategory;
    dynamicImpact: ScoreCategory;
  };
  strengths: string[];
  recommendations: Recommendation[];
}

export function generateProducerInsights(report: ReportData): ProducerInsights {
  const { tempo, keySig, energy, texture, sections, lyrics } = report;

  // 1. Dynamic Contrast Calculation (Verse vs Chorus energy lift)
  let verseEnergy = 0;
  let verseCount = 0;
  let chorusEnergy = 0;
  let chorusCount = 0;
  let chorusArrival: number | null = null;

  sections.forEach((s) => {
    const label = s.label.toLowerCase();
    if (label.includes("verse")) {
      verseEnergy += s.avgEnergy;
      verseCount++;
    } else if (label.includes("chorus") || label.includes("hook")) {
      chorusEnergy += s.avgEnergy;
      chorusCount++;
      if (chorusArrival === null) chorusArrival = s.start;
    }
  });

  const avgVerse = verseCount > 0 ? verseEnergy / verseCount : 0.45;
  const avgChorus = chorusCount > 0 ? chorusEnergy / chorusCount : 0.75;
  const dynamicContrastLiftPct =
    avgVerse > 0 ? Math.round(((avgChorus - avgVerse) / avgVerse) * 100) : null;

  // 2. Mix Balance Scoring
  let mixScore = 80;
  const dynRange = energy?.dynamicRangeDb ?? 10;
  if (dynRange < 6) mixScore -= 18; // over-compressed
  else if (dynRange > 18) mixScore -= 12; // under-compressed
  else mixScore += 8; // sweet spot

  const bassRatio = texture?.bassRatio.value ?? 0.3;
  if (bassRatio > 0.55) mixScore -= 14; // too muddy
  else if (bassRatio < 0.15) mixScore -= 10; // thin bass

  const brightness = texture?.brightnessHz.value ?? 3000;
  if (brightness < 1200) mixScore -= 10; // dark / muffled
  else if (brightness > 6500) mixScore -= 8; // harsh

  mixScore = Math.max(45, Math.min(98, mixScore));

  // 3. Arrangement Flow Scoring
  let arrScore = 75;
  if (sections.length >= 3) arrScore += 12;
  if (chorusArrival !== null && chorusArrival <= 55) arrScore += 8; // fast hook arrival
  if (dynamicContrastLiftPct !== null && dynamicContrastLiftPct >= 20) arrScore += 8;
  arrScore = Math.max(50, Math.min(96, arrScore));

  // 4. Vocal & Lyric Impact Scoring
  let vocalScore = 70;
  if (lyrics) {
    const rhyme = lyrics.rhymeDensity.value ?? 0.3;
    if (rhyme >= 0.45) vocalScore += 15;
    else if (rhyme >= 0.3) vocalScore += 8;

    const diversity = lyrics.diversity.value ?? 0.6;
    if (diversity >= 0.7) vocalScore += 8;

    if (lyrics.hooks.length > 0) vocalScore += 8;
  } else {
    vocalScore = 72; // default instrumental
  }
  vocalScore = Math.max(40, Math.min(97, vocalScore));

  // 5. Dynamic Impact Score
  let dynScore = 75;
  if (dynamicContrastLiftPct !== null) {
    if (dynamicContrastLiftPct >= 25) dynScore = 92;
    else if (dynamicContrastLiftPct >= 15) dynScore = 84;
    else dynScore = 68;
  }

  // Overall Score
  const overallScore = Math.round((mixScore * 0.3 + arrScore * 0.25 + vocalScore * 0.25 + dynScore * 0.2));

  let commercialVerdict = "Streaming Ready · Solid Commercial Production";
  if (overallScore >= 90) commercialVerdict = "Mastering Grade · Exceptional Punch & Clarity";
  else if (overallScore < 70) commercialVerdict = "Early Mix Stage · Needs Polish & Dynamic Contrast";

  // 6. Strengths List
  const strengths: string[] = [];
  if (dynRange >= 8 && dynRange <= 14) {
    strengths.push(`Punchy Dynamic Range (${dynRange.toFixed(1)} dB) ideal for Spotify/Apple Music loudness standards.`);
  }
  if (dynamicContrastLiftPct !== null && dynamicContrastLiftPct >= 20) {
    strengths.push(`Strong Verse-to-Chorus energy lift (+${dynamicContrastLiftPct}%) creates an impactful drop.`);
  }
  if (tempo.value && tempo.value >= 115 && tempo.value <= 130) {
    strengths.push(`Tempo (${tempo.value} BPM) hits the modern dance/pop radio sweet spot.`);
  }
  if (lyrics && lyrics.rhymeDensity.value && lyrics.rhymeDensity.value >= 0.35) {
    strengths.push(`High rhyme density (${Math.round(lyrics.rhymeDensity.value * 100)}%) reinforces hook memorability.`);
  }
  if (texture && texture.bassRatio.value && texture.bassRatio.value >= 0.22 && texture.bassRatio.value <= 0.42) {
    strengths.push(`Balanced low-end foundation (${Math.round(texture.bassRatio.value * 100)}% bass energy) without sub rumble.`);
  }
  if (strengths.length === 0) {
    strengths.push("Consistent track energy and steady groove across all bars.");
  }

  // 7. Actionable Recommendations
  const recommendations: Recommendation[] = [];

  if (dynRange < 7) {
    recommendations.push({
      category: "Mix & Master",
      tip: "The master bus is heavily limited. Back off your limiter threshold by 1.5–2 dB to let transient drums breathe.",
      importance: "high",
    });
  } else if (dynRange > 16) {
    recommendations.push({
      category: "Mix & Master",
      tip: "Dynamic range is very wide. Apply gentle glue compression (2:1 ratio, 30ms attack) on the drum & vocal buses.",
      importance: "medium",
    });
  }

  if (dynamicContrastLiftPct !== null && dynamicContrastLiftPct < 15) {
    recommendations.push({
      category: "Arrangement & Pacing",
      tip: "Chorus energy is close to the verse. Consider adding extra rhythm layers, open hi-hats, or doubling lead synths in the chorus.",
      importance: "high",
    });
  }

  if (texture && texture.brightnessHz.value && texture.brightnessHz.value > 5500) {
    recommendations.push({
      category: "Mix & Master",
      tip: "High-end brightness is elevated (>5.5 kHz). Check sibilance on vocals with a de-esser and soothe cymbal harshness.",
      importance: "medium",
    });
  }

  if (lyrics && lyrics.hooks.length === 0) {
    recommendations.push({
      category: "Vocals & Lyrics",
      tip: "No exact repeated hook candidate was identified. Consider establishing a clear, recurring lyrical tagline in the chorus.",
      importance: "tip",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      category: "Mix & Master",
      tip: "Check mono compatibility on small smartphone speakers to ensure the bass and lead vocal translate seamlessly.",
      importance: "tip",
    });
  }

  return {
    overallScore,
    commercialVerdict,
    dynamicContrastLiftPct,
    chorusArrivalTimeSec: chorusArrival,
    scores: {
      mixBalance: {
        score: mixScore,
        label: "Mix & Frequency Balance",
        verdict: mixScore >= 85 ? "Balanced" : "Needs EQ Polish",
        color: mixScore >= 80 ? "#45d498" : "#f0a63f",
      },
      arrangementFlow: {
        score: arrScore,
        label: "Arrangement Pacing",
        verdict: arrScore >= 85 ? "Optimal Pacing" : "Standard Structure",
        color: arrScore >= 80 ? "#58c7d8" : "#f0a63f",
      },
      vocalImpact: {
        score: vocalScore,
        label: "Vocal & Lyrical Impact",
        verdict: vocalScore >= 85 ? "Catchy & Structured" : "Flow Ready",
        color: vocalScore >= 80 ? "#a855f7" : "#58c7d8",
      },
      dynamicImpact: {
        score: dynScore,
        label: "Dynamic Energy Contrast",
        verdict: dynScore >= 85 ? "Explosive Drop" : "Steady Flow",
        color: dynScore >= 80 ? "#f0a63f" : "#8b95a9",
      },
    },
    strengths,
    recommendations,
  };
}
