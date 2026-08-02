"use client";

import { useEffect, useState } from "react";
import { useLocation } from "@/lib/hooks/useLocation";
import { useAstroState } from "@/lib/hooks/useAstroState";
import { SkyWheel } from "@/components/SkyWheel/SkyWheel";
import { Dashboard } from "@/components/Dashboard/Dashboard";

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

  if (!mounted) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-neutral-500">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col gap-6 bg-black p-6 text-neutral-100 lg:flex-row lg:items-start">
      <div className="flex flex-1 items-center justify-center">
        <SkyWheel
          planets={astro.planets}
          ascendant={astro.ascendant}
          descendant={astro.descendant}
          mode={astro.mode}
          onModeChange={astro.setMode}
          now={astro.now}
        />
      </div>
      <div className="w-full lg:w-80">
        <Dashboard locationState={locationState} now={astro.now} mode={astro.mode} />
      </div>
    </div>
  );
}
