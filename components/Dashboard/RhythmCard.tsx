"use client";

import { useMemo } from "react";
import { getSunriseSunset, getMoonriseMoonset, startOfLocalDay, type RiseSetTimes } from "@/lib/astro/events";
import { compassPointFor } from "@/lib/astro/compass";
import { PLANET_COLORS } from "@/components/SkyWheel/glyphs";
import type { GeoLocation } from "@/lib/astro/location";
import { Card } from "./Card";

interface RiseSetPoint {
  time: number;
  type: "rise" | "set";
  azimuth: number;
}

interface Segment {
  start: number;
  end: number;
  sign: 1 | -1;
}

// Time runs top-to-bottom over one real midnight-to-midnight day, shared by
// both curves - so where the Sun and Moon each cross the horizon lines up
// meaningfully with each other (e.g. "moonset happens a few hours after
// sunrise"), not just within each body's own rhythm. The horizon is a
// vertical line down the middle, with "up" (the Sun in daylight, the Moon
// while risen) bulging to the right and "down" to the left.
const WIDTH = 160;
const HEIGHT = 620;
const MID_X = WIDTH / 2;
const AMPLITUDE = 44;
const SAMPLE_COUNT = 180;
const SAMPLES_PER_FILL_SEGMENT = 24;

/** Rise/set events across a few days, so the curve has real neighbors on
 * both sides of the visible window (see buildSegments). */
function collectEvents(days: Date[], getTimes: (day: Date) => RiseSetTimes): RiseSetPoint[] {
  const events: RiseSetPoint[] = [];
  for (const day of days) {
    const { rise, set } = getTimes(day);
    if (rise) events.push({ time: rise.time.getTime(), type: "rise", azimuth: rise.azimuth });
    if (set) events.push({ time: set.time.getTime(), type: "set", azimuth: set.azimuth });
  }
  return events.sort((a, b) => a.time - b.time);
}

/**
 * Builds a continuous up/down sign timeline from a wider buffer of events
 * (spanning the day before and after what's actually shown) so the two
 * segments that straddle the visible window's midnight edges are genuine
 * spans over their *real* full duration (e.g. yesterday's sunset to today's
 * sunrise) rather than an invented one that happens to touch zero exactly
 * at midnight.
 */
function buildSegments(events: RiseSetPoint[]): Segment[] {
  if (events.length < 2) return [];
  // Sign of the (unrendered) state before events[0] - the first real span
  // is whatever comes right *after* that event, so it flips before being
  // used, not after.
  let sign: 1 | -1 = events[0].type === "rise" ? -1 : 1;
  const segments: Segment[] = [];
  for (let i = 0; i < events.length - 1; i++) {
    sign = (sign * -1) as 1 | -1;
    segments.push({ start: events[i].time, end: events[i + 1].time, sign });
  }
  return segments;
}

/**
 * A plain half-sine within each segment, scaled to that segment's *real*
 * duration - so day and night spans (which are essentially never equal
 * length) show their true relative width on the shared axis. The trade-off
 * for that real alignment: two segments of different lengths meeting at a
 * shared rise/set point generally don't have exactly matching slopes there,
 * so there's a small, honest kink at each crossing rather than a perfectly
 * seamless wave - the cost of keeping the vertical axis meaningful.
 */
function valueAt(t: number, segments: Segment[]): number {
  const segment = segments.find((s) => t >= s.start && t <= s.end);
  if (!segment) return 0;
  const span = segment.end - segment.start;
  if (span <= 0) return 0;
  const u = (t - segment.start) / span;
  return segment.sign * Math.sin(Math.PI * u);
}

function buildPoints(segments: Segment[], windowStart: number, windowEnd: number): string {
  return Array.from({ length: SAMPLE_COUNT + 1 }, (_, i) => {
    const t = windowStart + (i / SAMPLE_COUNT) * (windowEnd - windowStart);
    const y = (i / SAMPLE_COUNT) * HEIGHT;
    const x = MID_X + valueAt(t, segments) * AMPLITUDE;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

/**
 * A wash under just the "up" (right-hand) side of the curve - one closed
 * shape per up-segment, clipped to the visible window. A segment's curve
 * already starts and ends exactly on the horizon (x = MID_X), so tracing
 * the sampled curve points and closing the path is enough - the closing
 * edge lands right back on the vertical line with no separate "return"
 * segment to construct.
 */
function buildUpFillPath(segments: Segment[], windowStart: number, windowEnd: number): string {
  const yForT = (t: number) => ((t - windowStart) / (windowEnd - windowStart)) * HEIGHT;
  return segments
    .filter((s) => s.sign === 1)
    .map((segment) => {
      const clippedStart = Math.max(segment.start, windowStart);
      const clippedEnd = Math.min(segment.end, windowEnd);
      if (clippedEnd <= clippedStart) return "";
      const span = segment.end - segment.start;
      const points: string[] = [];
      // A segment clipped by the window edge no longer starts/ends at
      // x = MID_X (that only holds at the segment's own true start/end), so
      // the closing edge needs an explicit corner point on the horizon line
      // at the window boundary - otherwise Z's implicit close cuts a
      // diagonal straight to wherever the curve happened to be.
      if (segment.start < windowStart) {
        points.push(`${MID_X.toFixed(1)},${yForT(windowStart).toFixed(1)}`);
      }
      for (let i = 0; i <= SAMPLES_PER_FILL_SEGMENT; i++) {
        const t = clippedStart + (i / SAMPLES_PER_FILL_SEGMENT) * (clippedEnd - clippedStart);
        const u = span > 0 ? (t - segment.start) / span : 0;
        const x = MID_X + Math.sin(Math.PI * u) * AMPLITUDE;
        points.push(`${x.toFixed(1)},${yForT(t).toFixed(1)}`);
      }
      if (segment.end > windowEnd) {
        points.push(`${MID_X.toFixed(1)},${yForT(windowEnd).toFixed(1)}`);
      }
      return `M ${points.join(" L ")} Z`;
    })
    .filter(Boolean)
    .join(" ");
}

function formatTime(t: number): string {
  return new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function RhythmCard({ location, now }: { location: GeoLocation | null; now: Date }) {
  const dayKey = now.toDateString();

  const data = useMemo(() => {
    if (!location) return null;
    const today = startOfLocalDay(now);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const days = [yesterday, today, tomorrow];
    const windowStart = today.getTime();
    const windowEnd = tomorrow.getTime();

    const sunAllEvents = collectEvents(days, (d) => getSunriseSunset(d, location));
    const moonAllEvents = collectEvents(days, (d) => getMoonriseMoonset(d, location));
    const inWindow = (e: RiseSetPoint) => e.time >= windowStart && e.time <= windowEnd;

    return {
      windowStart,
      windowEnd,
      sunSegments: buildSegments(sunAllEvents),
      moonSegments: buildSegments(moonAllEvents),
      sunEvents: sunAllEvents.filter(inWindow),
      moonEvents: moonAllEvents.filter(inWindow),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, dayKey]);

  if (!data) {
    return (
      <Card title="Sun & Moon Rhythm">
        <div className="text-sm text-neutral-400">Waiting for location…</div>
      </Card>
    );
  }

  const { windowStart, windowEnd, sunSegments, moonSegments, sunEvents, moonEvents } = data;
  const yFor = (t: number) => ((t - windowStart) / (windowEnd - windowStart)) * HEIGHT;
  const nowT = now.getTime();
  const showNow = nowT >= windowStart && nowT <= windowEnd;
  const nowY = showNow ? yFor(nowT) : 0;

  return (
    <Card title="Sun & Moon Rhythm">
      <div className="mb-2 flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PLANET_COLORS.Sun }} />
          <span className="text-neutral-400">Sun</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PLANET_COLORS.Moon }} />
          <span className="text-neutral-400">Moon</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-[420px] w-full">
        <path d={buildUpFillPath(sunSegments, windowStart, windowEnd)} fill={PLANET_COLORS.Sun} fillOpacity={0.12} stroke="none" />
        <path d={buildUpFillPath(moonSegments, windowStart, windowEnd)} fill={PLANET_COLORS.Moon} fillOpacity={0.12} stroke="none" />

        <line x1={MID_X} y1={0} x2={MID_X} y2={HEIGHT} stroke="#404040" strokeWidth={1} />

        <polyline
          points={buildPoints(sunSegments, windowStart, windowEnd)}
          fill="none"
          stroke={PLANET_COLORS.Sun}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={buildPoints(moonSegments, windowStart, windowEnd)}
          fill="none"
          stroke={PLANET_COLORS.Moon}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {sunEvents.map((e) => (
          <g key={`sun-${e.time}`}>
            <line x1={0} y1={yFor(e.time)} x2={MID_X} y2={yFor(e.time)} stroke={PLANET_COLORS.Sun} strokeOpacity={0.3} strokeWidth={1} />
            <rect x={MID_X - 3} y={yFor(e.time) - 3} width={6} height={6} fill={PLANET_COLORS.Sun} />
            <text x={2} y={yFor(e.time) - 4} fontSize={9} fill="#9ca3af">
              {formatTime(e.time)}
            </text>
            <text x={2} y={yFor(e.time) + 11} fontSize={9} fill="#9ca3af">
              {compassPointFor(e.azimuth)}
            </text>
          </g>
        ))}
        {moonEvents.map((e) => (
          <g key={`moon-${e.time}`}>
            <line x1={MID_X} y1={yFor(e.time)} x2={WIDTH} y2={yFor(e.time)} stroke={PLANET_COLORS.Moon} strokeOpacity={0.3} strokeWidth={1} />
            <rect x={MID_X - 3} y={yFor(e.time) - 3} width={6} height={6} fill={PLANET_COLORS.Moon} />
            <text x={WIDTH - 2} y={yFor(e.time) - 4} textAnchor="end" fontSize={9} fill="#9ca3af">
              {formatTime(e.time)}
            </text>
            <text x={WIDTH - 2} y={yFor(e.time) + 11} textAnchor="end" fontSize={9} fill="#9ca3af">
              {compassPointFor(e.azimuth)}
            </text>
          </g>
        ))}

        {showNow && (
          <circle cx={MID_X + valueAt(nowT, sunSegments) * AMPLITUDE} cy={nowY} r={7} fill={PLANET_COLORS.Sun} stroke="#171717" strokeWidth={2} />
        )}
        {showNow && (
          <circle
            cx={MID_X + valueAt(nowT, moonSegments) * AMPLITUDE}
            cy={nowY}
            r={7}
            fill={PLANET_COLORS.Moon}
            stroke="#171717"
            strokeWidth={2}
          />
        )}
      </svg>
    </Card>
  );
}
