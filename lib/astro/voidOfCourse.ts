import { getEclipticLongitude, type CelestialBody } from "./positions";
import { getZodiacPosition, ZODIAC_SIGNS } from "./zodiac";
import { signedDelta } from "./math";
import type { AspectType } from "./aspects";

// Traditional void-of-course only looks at the Moon's aspects to the
// classical ("Ptolemaic") planets - the same slow outer bodies AspectsCard
// excludes are excluded here too, since they're essentially never exact.
const VOC_BODIES: CelestialBody[] = ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

const ASPECT_ANGLES: { type: AspectType; angle: number; glyph: string }[] = [
  { type: "conjunction", angle: 0, glyph: "☌" },
  { type: "sextile", angle: 60, glyph: "⚹" },
  { type: "square", angle: 90, glyph: "□" },
  { type: "trine", angle: 120, glyph: "△" },
  { type: "opposition", angle: 180, glyph: "☍" },
];

// The Moon spends at most ~2.3 days in a sign (30deg / ~13.2deg/day); this
// leaves a comfortable margin without searching far past what's needed.
const STEP_MS = 30 * 60 * 1000;
const MAX_STEPS = 3 * 24 * 2; // 3 days of 30-minute steps

export interface VoidOfCourseInfo {
  /** True if the Moon won't complete any more major aspects before it changes sign. */
  isVoid: boolean;
  /** When the void period ends - the Moon's ingress into `nextSignName`. */
  voidUntil: Date;
  nextSignName: string;
  /** The last aspect the Moon completes before going void, if it hasn't yet. */
  lastAspect: { body: CelestialBody; type: AspectType; glyph: string; time: Date } | null;
}

interface LongitudeSample {
  time: Date;
  /** Raw [0, 360) longitude at this sample. */
  raw: number;
  /** Cumulative unwrapped longitude since the first sample - always increasing, so
   * crossing a target is a simple threshold check instead of a mod-360 comparison. */
  cumulative: number;
}

function sampleLongitude(body: CelestialBody, from: Date): LongitudeSample[] {
  const samples: LongitudeSample[] = [];
  let prevRaw = getEclipticLongitude(body, from);
  let cumulative = prevRaw;
  samples.push({ time: from, raw: prevRaw, cumulative });

  let t = from;
  for (let i = 0; i < MAX_STEPS; i++) {
    t = new Date(t.getTime() + STEP_MS);
    const raw = getEclipticLongitude(body, t);
    let delta = raw - prevRaw;
    if (delta < 0) delta += 360; // wrapped past 360 -> 0
    cumulative += delta;
    samples.push({ time: t, raw, cumulative });
    prevRaw = raw;
  }
  return samples;
}

export function getVoidOfCourse(now: Date): VoidOfCourseInfo {
  const moonSamples = sampleLongitude("Moon", now);
  const moonNow = moonSamples[0].raw;

  const currentSign = getZodiacPosition(moonNow).sign;
  const nextSign = ZODIAC_SIGNS[(ZODIAC_SIGNS.indexOf(currentSign) + 1) % 12];
  let targetTravel = nextSign.startLongitude - moonNow;
  if (targetTravel <= 0) targetTravel += 360;

  // Ingress time: first sample where the Moon has traveled `targetTravel`
  // degrees since `now`, linearly interpolated within the bracketing step.
  let ingressTime = moonSamples[moonSamples.length - 1].time;
  for (let i = 1; i < moonSamples.length; i++) {
    const prevTravel = moonSamples[i - 1].cumulative - moonNow;
    const travel = moonSamples[i].cumulative - moonNow;
    if (travel >= targetTravel) {
      const frac = (targetTravel - prevTravel) / (travel - prevTravel);
      ingressTime = new Date(moonSamples[i - 1].time.getTime() + frac * STEP_MS);
      break;
    }
  }

  // For each classical body, look for the Moon's separation from it crossing
  // an exact aspect angle before ingress - each crossing is a future aspect
  // the Moon still has to complete.
  const crossings: { time: Date; body: CelestialBody; type: AspectType; glyph: string }[] = [];
  for (const body of VOC_BODIES) {
    const bodySamples = sampleLongitude(body, now);
    for (let i = 1; i < moonSamples.length; i++) {
      if (moonSamples[i].time > ingressTime) break;
      const sep0 = Math.abs(signedDelta(bodySamples[i - 1].raw, moonSamples[i - 1].raw));
      const sep1 = Math.abs(signedDelta(bodySamples[i].raw, moonSamples[i].raw));
      for (const { type, angle, glyph } of ASPECT_ANGLES) {
        const d0 = sep0 - angle;
        const d1 = sep1 - angle;
        if (d0 === 0 || d0 * d1 < 0) {
          const frac = d0 === 0 ? 0 : d0 / (d0 - d1);
          const time = new Date(moonSamples[i - 1].time.getTime() + frac * STEP_MS);
          crossings.push({ time, body, type, glyph });
        }
      }
    }
  }

  crossings.sort((a, b) => a.time.getTime() - b.time.getTime());
  const last = crossings.length > 0 ? crossings[crossings.length - 1] : null;

  return {
    isVoid: last === null,
    voidUntil: ingressTime,
    nextSignName: nextSign.name,
    lastAspect: last ? { body: last.body, type: last.type, glyph: last.glyph, time: last.time } : null,
  };
}
