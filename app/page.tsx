"use client";

import { useEffect, useState } from "react";
import { useLocation } from "@/lib/hooks/useLocation";
import { useAstroState } from "@/lib/hooks/useAstroState";
import { useNatalData } from "@/lib/hooks/useNatalData";
import { useNatalChart } from "@/lib/hooks/useNatalChart";
import { useHouseCusps } from "@/lib/hooks/useHouseCusps";
import type { HouseSystem } from "@/lib/astro/houses";
import { SkyWheel, type SkyWheelDisplayMode } from "@/components/SkyWheel/SkyWheel";
import { Card } from "@/components/Dashboard/Card";
import { ClockCard } from "@/components/Dashboard/ClockCard";
import { WeatherCard } from "@/components/Dashboard/WeatherCard";
import { AspectsCard } from "@/components/Dashboard/AspectsCard";
import { NatalChartCard } from "@/components/Dashboard/NatalChartCard";
import { NatalPositionsCard } from "@/components/Dashboard/NatalPositionsCard";
import { SatelliteCard } from "@/components/Dashboard/SatelliteCard";
import { SunCard } from "@/components/Dashboard/SunCard";
import { MoonCard } from "@/components/Dashboard/MoonCard";

export default function Home() {
  // Everything here depends on the client's clock/geolocation/localStorage,
  // so there's nothing meaningful to server-render. Gating on mount (rather
  // than computing live positions during SSR) avoids a hydration mismatch:
  // `now` would otherwise be captured at a slightly different instant on
  // the server vs. the client, shifting every planet's ecliptic longitude
  // by a fraction of a degree and mismatching every SVG coordinate.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  const locationState = useLocation();
  const astro = useAstroState(locationState.location);
  const natalState = useNatalData();
  const natalChart = useNatalChart(natalState.natalData, astro.mode);
  const sunLongitude = astro.planets.find((p) => p.body === "Sun")?.eclipticLongitude ?? 0;
  const moonLongitude = astro.planets.find((p) => p.body === "Moon")?.eclipticLongitude ?? 0;

  // Lifted out of SkyWheel (rather than local state there) so the Aspects
  // and natal-positions cards can switch to natal/transit data too, matching
  // whichever display mode and house system the wheel itself is showing.
  const [displayMode, setDisplayMode] = useState<SkyWheelDisplayMode>("current");
  const [houseSystem, setHouseSystem] = useState<HouseSystem>("whole-sign");
  const inNatalMode = displayMode === "natal" && Boolean(natalChart);
  const inTransitsMode = displayMode === "transits" && Boolean(natalChart);
  const aspectsDate = inNatalMode && natalChart ? natalChart.birthInstant : astro.now;
  const transitAspectsInput =
    inTransitsMode && natalChart ? { transitingPlanets: astro.planets, natalPlanets: natalChart.planets } : undefined;
  // Always the natal chart's own houses (never the live ones) - this feeds
  // NatalPositionsCard, which only ever renders once natalChart exists, so
  // the fallback values below are just to keep the hook call unconditional.
  const natalHouseCusps = useHouseCusps(
    houseSystem,
    natalChart?.birthInstant ?? astro.now,
    natalChart?.location ?? null,
    natalChart?.ascendant ?? 0,
    astro.mode,
  );

  if (!mounted) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-neutral-500">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center gap-6 bg-black p-6 text-neutral-100">
      <div className="flex w-full flex-1 flex-col items-center gap-3 lg:flex-row lg:items-stretch lg:justify-center">
        <div className="order-2 flex w-full flex-col gap-3 lg:order-1 lg:w-[17.625rem]">
          <div className="[&>div]:h-full">
            <ClockCard locationState={locationState} />
          </div>
          <div className="[&>div]:h-full">
            <WeatherCard location={locationState.location} />
          </div>
          {/* In Natal mode, Aspects moves to the right column instead,
              grouped with the rest of the natal-specific cards. */}
          {!inNatalMode && (
            <div className="[&>div]:h-full">
              <AspectsCard now={aspectsDate} transits={transitAspectsInput} />
            </div>
          )}
          {/* flex-1 + the inner Card stretched to h-full - so this card's
              bottom edge always lines up with the wheel's, however much
              vertical room is left over above it. Satellite is always last
              here regardless of mode, so it's always the one that stretches. */}
          <div className="lg:flex-1 lg:[&>div]:h-full">
            <SatelliteCard location={locationState.location} />
          </div>
        </div>

        <div className="order-1 w-full max-w-[852px] min-w-0 lg:order-2 lg:[&>div]:flex lg:[&>div]:h-full lg:[&>div]:flex-col lg:[&>div]:justify-center">
          <Card>
            <SkyWheel
              planets={astro.planets}
              ascendant={astro.ascendant}
              descendant={astro.descendant}
              midheaven={astro.midheaven}
              mode={astro.mode}
              onModeChange={astro.setMode}
              now={astro.now}
              location={locationState.location}
              natalChart={natalChart}
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
              houseSystem={houseSystem}
              onHouseSystemChange={setHouseSystem}
            />
          </Card>
        </div>

        <div className="order-3 flex w-full flex-col gap-3 lg:w-[17.625rem]">
          {inNatalMode && natalChart ? (
            // Sun/Moon's live sunrise/sunset/space-weather content has no
            // birth-moment equivalent worth showing, so this whole column
            // becomes natal-specific instead: the chart card itself (now
            // useful again, alongside the data it produced), natal aspects,
            // then the full positions table.
            <>
              <div className="[&>div]:h-full">
                <NatalChartCard natalState={natalState} />
              </div>
              <div className="[&>div]:h-full">
                <AspectsCard now={aspectsDate} natal />
              </div>
              <div className="lg:flex-1 lg:[&>div]:h-full">
                <NatalPositionsCard natalChart={natalChart} houseCusps={natalHouseCusps} />
              </div>
            </>
          ) : (
            <>
              {/* Only until birth data exists - once it does, editing it
                  belongs in Natal mode instead, not cluttering this one. */}
              {!natalChart && (
                <div className="[&>div]:h-full">
                  <NatalChartCard natalState={natalState} />
                </div>
              )}
              <div className="[&>div]:h-full">
                <SunCard longitude={sunLongitude} location={locationState.location} now={astro.now} />
              </div>
              <div className="lg:flex-1 lg:[&>div]:h-full">
                <MoonCard longitude={moonLongitude} location={locationState.location} now={astro.now} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
