"use client";

import { useEffect, useState } from "react";
import { useLocation } from "@/lib/hooks/useLocation";
import { useAstroState } from "@/lib/hooks/useAstroState";
import { SkyWheel } from "@/components/SkyWheel/SkyWheel";
import { Card } from "@/components/Dashboard/Card";
import { ClockCard } from "@/components/Dashboard/ClockCard";
import { WeatherCard } from "@/components/Dashboard/WeatherCard";
import { AspectsCard } from "@/components/Dashboard/AspectsCard";
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
  const sunLongitude = astro.planets.find((p) => p.body === "Sun")?.eclipticLongitude ?? 0;
  const moonLongitude = astro.planets.find((p) => p.body === "Moon")?.eclipticLongitude ?? 0;

  if (!mounted) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-neutral-500">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center gap-6 bg-black p-6 text-neutral-100">
      <div className="flex w-full flex-1 flex-col items-center gap-3 lg:flex-row lg:items-stretch lg:justify-center">
        <div className="order-2 flex w-full flex-col gap-3 lg:order-1 lg:w-[36rem]">
          <div className="flex items-stretch gap-3">
            <div className="min-w-0 flex-1 [&>div]:h-full">
              <ClockCard locationState={locationState} />
            </div>
            <div className="min-w-0 flex-1 [&>div]:h-full">
              <WeatherCard location={locationState.location} />
            </div>
          </div>
          <div className="flex items-stretch gap-3">
            <div className="min-w-0 flex-1 [&>div]:h-full">
              <SunCard longitude={sunLongitude} location={locationState.location} now={astro.now} />
            </div>
            <div className="min-w-0 flex-1 [&>div]:h-full">
              <MoonCard longitude={moonLongitude} location={locationState.location} now={astro.now} />
            </div>
          </div>
          {/* flex-1 + the inner Card stretched to h-full - so this card's
              bottom edge always lines up with the wheel's, however much
              vertical room is left over above it. */}
          <div className="flex items-stretch gap-3 lg:flex-1">
            <div className="min-w-0 flex-1 lg:[&>div]:h-full">
              <AspectsCard now={astro.now} />
            </div>
            <div className="min-w-0 flex-1 lg:[&>div]:h-full">
              <SatelliteCard location={locationState.location} />
            </div>
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
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
