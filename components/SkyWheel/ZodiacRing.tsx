import { ZODIAC_SIGNS } from "@/lib/astro/zodiac";
import { annularWedgePath, polarToPoint, radialTickPath, screenAngle } from "./geometry";
import { ELEMENT_COLORS, SYMBOL_FONT_FAMILY } from "./glyphs";

export interface ZodiacRingProps {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  ascendant: number;
}

const MINOR_TICK_STEP = 5;
const DECAN_TICK_STEP = 10;

export function ZodiacRing({ cx, cy, innerRadius, outerRadius, ascendant }: ZodiacRingProps) {
  const glyphRadius = (innerRadius + outerRadius) / 2;
  const tickInnerRadius = outerRadius - (outerRadius - innerRadius) * 0.22;

  return (
    <g>
      {ZODIAC_SIGNS.map((sign) => {
        const angleStart = screenAngle(sign.startLongitude, ascendant);
        const angleEnd = screenAngle(sign.startLongitude + 30, ascendant);
        const glyphAngle = screenAngle(sign.startLongitude + 15, ascendant);
        const glyphPoint = polarToPoint(cx, cy, glyphRadius, glyphAngle);

        return (
          <g key={sign.name}>
            <path
              d={annularWedgePath(cx, cy, innerRadius, outerRadius, angleStart, angleEnd)}
              fill={ELEMENT_COLORS[sign.element]}
              fillOpacity={0.16}
              stroke="none"
            />
            {/* Minor/decan tick marks every 5 degrees within the sign. */}
            {Array.from({ length: 30 / MINOR_TICK_STEP - 1 }, (_, i) => (i + 1) * MINOR_TICK_STEP).map((offset) => {
              const isDecan = offset % DECAN_TICK_STEP === 0;
              const tickAngle = screenAngle(sign.startLongitude + offset, ascendant);
              return (
                <path
                  key={offset}
                  d={radialTickPath(cx, cy, isDecan ? tickInnerRadius : (tickInnerRadius + outerRadius) / 2, outerRadius, tickAngle)}
                  stroke="currentColor"
                  strokeOpacity={isDecan ? 0.55 : 0.3}
                  strokeWidth={isDecan ? 1.25 : 0.75}
                />
              );
            })}
            <text
              x={glyphPoint.x}
              y={glyphPoint.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={outerRadius * 0.11}
              fontFamily={SYMBOL_FONT_FAMILY}
              fill="currentColor"
            >
              {sign.glyph}
            </text>
          </g>
        );
      })}
      {/* Sign boundary lines. */}
      {ZODIAC_SIGNS.map((sign) => {
        const angle = screenAngle(sign.startLongitude, ascendant);
        return (
          <path
            key={`boundary-${sign.name}`}
            d={radialTickPath(cx, cy, innerRadius, outerRadius, angle)}
            stroke="currentColor"
            strokeOpacity={0.5}
            strokeWidth={1.5}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={outerRadius} fill="none" stroke="currentColor" strokeOpacity={0.5} />
      <circle cx={cx} cy={cy} r={innerRadius} fill="none" stroke="currentColor" strokeOpacity={0.5} />
    </g>
  );
}
