/**
 * Hand-drawn vector glyphs for Uranus, Neptune, and Pluto.
 *
 * The other 7 tracked bodies render fine as Unicode text with the Apple
 * Symbols font stack, but these three (added to Unicode later, in the
 * Miscellaneous Symbols block) render as wrong/illegible glyphs even with
 * an explicit symbol-font fallback - confirmed by checking the actual DOM
 * text content (correct codepoints) against a screenshot (wrong shapes).
 * Drawing them as paths sidesteps font/glyph-coverage entirely.
 *
 * Each icon is drawn centered at (0, 0) at a nominal radius of ~5 units;
 * callers scale/translate via a wrapping <g transform>.
 */

export type OuterPlanet = "Uranus" | "Neptune" | "Pluto";

interface IconProps {
  color: string;
  strokeWidth: number;
}

function UranusIcon({ color, strokeWidth }: IconProps) {
  return (
    <g stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round">
      <path d="M -3 -5 L -3 1 M 3 -5 L 3 1 M -3 -2 L 3 -2 M 0 -0.4 L 0 3.2" />
      <circle cx={0} cy={-2} r={1.5} fill={color} stroke="none" />
    </g>
  );
}

function NeptuneIcon({ color, strokeWidth }: IconProps) {
  return (
    <g stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M -2.6 -1 L -1.8 -4.2 M 2.6 -1 L 1.8 -4.2 M 0 -1 L 0 -4.4 M -2.6 -1 L 2.6 -1 M 0 -1 L 0 4 M -1.5 2 L 1.5 2" />
    </g>
  );
}

function PlutoIcon({ color, strokeWidth }: IconProps) {
  return (
    <g stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round">
      <path d="M -2.1 -2.6 A 2.2 2.2 0 0 0 2.1 -2.6" />
      <circle cx={0} cy={0.5} r={1.5} fill={color} stroke="none" />
      <path d="M 0 2.2 L 0 5 M -1.4 3.4 L 1.4 3.4" />
    </g>
  );
}

const OUTER_PLANET_ICONS: Record<OuterPlanet, (props: IconProps) => React.ReactElement> = {
  Uranus: UranusIcon,
  Neptune: NeptuneIcon,
  Pluto: PlutoIcon,
};

export function isOuterPlanet(body: string): body is OuterPlanet {
  return body in OUTER_PLANET_ICONS;
}

export function OuterPlanetIcon({
  body,
  x,
  y,
  scale,
  color,
}: {
  body: OuterPlanet;
  x: number;
  y: number;
  scale: number;
  color: string;
}) {
  const Icon = OUTER_PLANET_ICONS[body];
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Icon color={color} strokeWidth={0.9 / scale} />
    </g>
  );
}
