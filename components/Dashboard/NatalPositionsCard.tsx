import { getZodiacPosition } from "@/lib/astro/zodiac";
import { getHouseOfLongitude, type HouseCusp } from "@/lib/astro/houses";
import type { NatalChart } from "@/lib/hooks/useNatalChart";
import { PLANET_GLYPHS, PLANET_COLORS, LUNAR_NODE_GLYPHS, ELEMENT_COLORS, SYMBOL_FONT_FAMILY } from "@/components/SkyWheel/glyphs";
import { Card } from "./Card";

// Same neutral slate the wheel's own lunar-node markers use.
const NODE_COLOR = "#94a3b8";

interface PositionRowProps {
  glyph: string;
  color: string;
  longitude: number;
  house?: number;
  retrograde?: boolean;
}

function PositionRow({ glyph, color, longitude, house, retrograde }: PositionRowProps) {
  const { sign, degreeInSign } = getZodiacPosition(longitude);
  // Planet/node glyphs are a single character and read well enlarged; "ASC"
  // is plain text and would just look oversized/clumsy blown up the same way.
  const isSymbol = glyph.length === 1;
  return (
    <>
      <div
        className={`pr-2 text-center leading-none ${isSymbol ? "text-2xl" : "text-xs font-semibold"}`}
        style={{ color, fontFamily: SYMBOL_FONT_FAMILY }}
      >
        {glyph}
      </div>
      <div className="flex items-baseline gap-1 whitespace-nowrap">
        <span className="text-lg" style={{ color: ELEMENT_COLORS[sign.element], fontFamily: SYMBOL_FONT_FAMILY }}>
          {sign.glyph}
        </span>
        <span>{Math.floor(degreeInSign)}°</span>
      </div>
      <div className="text-neutral-500">{house !== undefined ? `H${house}` : ""}</div>
      <div className="text-amber-400">{retrograde ? "℞" : ""}</div>
    </>
  );
}

/**
 * The classic natal-report "positions table": Rising, then each planet, then
 * the lunar nodes, each with sign/degree/house - everything Aspects (its own
 * card) doesn't already cover. Only meaningful in Natal Chart mode, where it
 * replaces the Sun/Moon cards (whose live sunrise/sunset/space-weather
 * content has no birth-moment equivalent worth showing here).
 */
export function NatalPositionsCard({ natalChart, houseCusps }: { natalChart: NatalChart; houseCusps: HouseCusp[] }) {
  const houseOf = (longitude: number) => getHouseOfLongitude(longitude, houseCusps);

  return (
    <Card title="Natal Positions">
      <div className="grid grid-cols-[auto_auto_1.75rem_1rem] items-baseline gap-x-1.5 gap-y-2 text-xs">
        <PositionRow glyph="ASC" color="#fbbf24" longitude={natalChart.ascendant} />
        {natalChart.planets.map((planet) => (
          <PositionRow
            key={planet.body}
            glyph={PLANET_GLYPHS[planet.body]}
            color={PLANET_COLORS[planet.body]}
            longitude={planet.eclipticLongitude}
            house={houseOf(planet.eclipticLongitude)}
            retrograde={planet.retrograde}
          />
        ))}
        <PositionRow
          glyph={LUNAR_NODE_GLYPHS.north}
          color={NODE_COLOR}
          longitude={natalChart.lunarNodes.northNodeLongitude}
          house={houseOf(natalChart.lunarNodes.northNodeLongitude)}
        />
        <PositionRow
          glyph={LUNAR_NODE_GLYPHS.south}
          color={NODE_COLOR}
          longitude={natalChart.lunarNodes.southNodeLongitude}
          house={houseOf(natalChart.lunarNodes.southNodeLongitude)}
        />
      </div>
    </Card>
  );
}
