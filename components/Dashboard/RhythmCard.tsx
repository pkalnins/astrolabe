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

// Time runs left-to-right over one real midnight-to-midnight day, shared by
// both curves - so where the Sun and Moon each cross the horizon lines up
// meaningfully with each other (e.g. "moonset happens a few hours after
// sunrise"), not just within each body's own rhythm. The horizon is a
// horizontal line through the middle, with "up" (the Sun in daylight, the
// Moon while risen) bulging above it and "down" below.
const TIME_AXIS = 620;
const BULGE_SPAN = 160;
const MID_Y = BULGE_SPAN / 2;
const AMPLITUDE = 44;
const SAMPLE_COUNT = 180;
const SAMPLES_PER_FILL_SEGMENT = 24;
// Large enough that the RISE/SET event labels' own text - stacked 3 lines,
// up to fontSize 11 - actually fit above/below the plotted BULGE_SPAN
// without their glyphs' ascent/descent clipping against the viewBox edge.
// The reference-line labels (12am/12pm, a single smaller line) need far
// less room, but share this same margin for a consistent top/bottom band.
const MARGIN_Y = 24;
// Larger than the vertical layout's equivalent constant was: this axis now
// carries the event labels' *width* (e.g. "10:24 AM"), not their height, so
// it takes much more clearance to avoid the reference label's text actually
// touching it.
const REFERENCE_LABEL_CLEARANCE = 70;
const EVENT_LABEL_LINE_HEIGHT = 12;

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
 * seamless wave - the cost of keeping the horizontal axis meaningful.
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
    const x = (i / SAMPLE_COUNT) * TIME_AXIS;
    const y = MID_Y - valueAt(t, segments) * AMPLITUDE;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

/**
 * A wash under just the "up" (above-horizon) side of the curve - one closed
 * shape per up-segment, clipped to the visible window. A segment's curve
 * already starts and ends exactly on the horizon (y = MID_Y), so tracing
 * the sampled curve points and closing the path is enough - the closing
 * edge lands right back on the horizontal line with no separate "return"
 * segment to construct.
 */
function buildUpFillPath(segments: Segment[], windowStart: number, windowEnd: number): string {
  const xForT = (t: number) => ((t - windowStart) / (windowEnd - windowStart)) * TIME_AXIS;
  return segments
    .filter((s) => s.sign === 1)
    .map((segment) => {
      const clippedStart = Math.max(segment.start, windowStart);
      const clippedEnd = Math.min(segment.end, windowEnd);
      if (clippedEnd <= clippedStart) return "";
      const span = segment.end - segment.start;
      const points: string[] = [];
      // A segment clipped by the window edge no longer starts/ends at
      // y = MID_Y (that only holds at the segment's own true start/end), so
      // the closing edge needs an explicit corner point on the horizon line
      // at the window boundary - otherwise Z's implicit close cuts a
      // diagonal straight to wherever the curve happened to be.
      if (segment.start < windowStart) {
        points.push(`${xForT(windowStart).toFixed(1)},${MID_Y.toFixed(1)}`);
      }
      for (let i = 0; i <= SAMPLES_PER_FILL_SEGMENT; i++) {
        const t = clippedStart + (i / SAMPLES_PER_FILL_SEGMENT) * (clippedEnd - clippedStart);
        const u = span > 0 ? (t - segment.start) / span : 0;
        const y = MID_Y - Math.sin(Math.PI * u) * AMPLITUDE;
        points.push(`${xForT(t).toFixed(1)},${y.toFixed(1)}`);
      }
      if (segment.end > windowEnd) {
        points.push(`${xForT(windowEnd).toFixed(1)},${MID_Y.toFixed(1)}`);
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
  const xFor = (t: number) => ((t - windowStart) / (windowEnd - windowStart)) * TIME_AXIS;
  const nowT = now.getTime();
  const showNow = nowT >= windowStart && nowT <= windowEnd;
  const nowX = showNow ? xFor(nowT) : 0;

  // Which side has more room depends on where the *other* body's curve is at
  // this time - not a fixed per-body side - so a label never lands on top of
  // the other curve as it bulges toward one edge.
  const isTopSide = (time: number, otherSegments: Segment[]) => valueAt(time, otherSegments) > 0;

  const renderEvent = (e: RiseSetPoint, color: string, otherSegments: Segment[]) => {
    const isTop = isTopSide(e.time, otherSegments);
    const x = xFor(e.time);
    // Three stacked lines (RISE/time/compass), always in that top-to-bottom
    // reading order regardless of which edge the block sits near - anchored
    // close to the top edge growing down, or close to the bottom edge
    // growing up, so the block itself never crosses the horizon.
    const riseY = isTop ? -14 : BULGE_SPAN - 10;
    const timeY = riseY + EVENT_LABEL_LINE_HEIGHT;
    const compassY = timeY + EVENT_LABEL_LINE_HEIGHT;
    return (
      <g key={`${color}-${e.time}`}>
        <line x1={x} y1={isTop ? 0 : BULGE_SPAN} x2={x} y2={MID_Y} stroke={color} strokeOpacity={0.3} strokeWidth={1} />
        <rect x={x - 3} y={MID_Y - 3} width={6} height={6} fill={color} />
        <text x={x} y={riseY} textAnchor="middle" fontSize={7} letterSpacing={0.5} fill="#6b7280">
          {e.type === "rise" ? "RISE" : "SET"}
        </text>
        <text x={x} y={timeY} textAnchor="middle" fontSize={11} fill="#9ca3af">
          {formatTime(e.time)}
        </text>
        <text x={x} y={compassY} textAnchor="middle" fontSize={9} fill="#9ca3af">
          {compassPointFor(e.azimuth)}
        </text>
      </g>
    );
  };

  // The 12am/12pm reference labels default to the top, but flip to the
  // bottom whenever a rise/set label has already claimed the top side at
  // roughly this time - otherwise the two can print on top of each other on
  // days when an event happens to fall near midnight or noon.
  const eventXSides = [
    ...sunEvents.map((e) => ({ x: xFor(e.time), isTop: isTopSide(e.time, moonSegments) })),
    ...moonEvents.map((e) => ({ x: xFor(e.time), isTop: isTopSide(e.time, sunSegments) })),
  ];
  const referenceIsTop = (lineX: number): boolean =>
    !eventXSides.some(({ x, isTop }) => isTop && Math.abs(x - lineX) < REFERENCE_LABEL_CLEARANCE);

  const renderReferenceLine = (lineX: number, xAnchor: "start" | "middle" | "end", label: string) => {
    const isTop = referenceIsTop(lineX);
    const y = isTop ? -5 : BULGE_SPAN + 12;
    return (
      <g key={label + lineX}>
        <line x1={lineX} y1={0} x2={lineX} y2={BULGE_SPAN} stroke="#4b5563" strokeWidth={1} />
        <text x={lineX} y={y} textAnchor={xAnchor} fontSize={8} fill="#6b7280">
          {label}
        </text>
      </g>
    );
  };

  return (
    <Card title="Sun & Moon Rhythm">
      <div className="mb-3 flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PLANET_COLORS.Sun }} />
          <span className="text-neutral-400">Sun</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PLANET_COLORS.Moon }} />
          <span className="text-neutral-400">Moon</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${TIME_AXIS} ${BULGE_SPAN + MARGIN_Y * 2}`} preserveAspectRatio="none" className="h-[240px] w-full">
        <g transform={`translate(0, ${MARGIN_Y})`}>
          <path d={buildUpFillPath(sunSegments, windowStart, windowEnd)} fill={PLANET_COLORS.Sun} fillOpacity={0.12} stroke="none" />
          <path d={buildUpFillPath(moonSegments, windowStart, windowEnd)} fill={PLANET_COLORS.Moon} fillOpacity={0.12} stroke="none" />

          {renderReferenceLine(0, "start", "12am")}
          {renderReferenceLine(TIME_AXIS / 2, "middle", "12pm")}
          {renderReferenceLine(TIME_AXIS, "end", "12am")}

          <line x1={0} y1={MID_Y} x2={TIME_AXIS} y2={MID_Y} stroke="#404040" strokeWidth={1} />

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

          {sunEvents.map((e) => renderEvent(e, PLANET_COLORS.Sun, moonSegments))}
          {moonEvents.map((e) => renderEvent(e, PLANET_COLORS.Moon, sunSegments))}

          {showNow && (
            <circle cx={nowX} cy={MID_Y - valueAt(nowT, sunSegments) * AMPLITUDE} r={7} fill={PLANET_COLORS.Sun} stroke="#171717" strokeWidth={2} />
          )}
          {showNow && (
            <circle
              cx={nowX}
              cy={MID_Y - valueAt(nowT, moonSegments) * AMPLITUDE}
              r={7}
              fill={PLANET_COLORS.Moon}
              stroke="#171717"
              strokeWidth={2}
            />
          )}
        </g>
      </svg>
    </Card>
  );
}
