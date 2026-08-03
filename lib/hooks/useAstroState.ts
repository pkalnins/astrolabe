"use client";

import { useEffect, useMemo, useState } from "react";
import { getAllPlanetPositions, type PlanetPosition } from "@/lib/astro/positions";
import { getAscendant } from "@/lib/astro/ascendant";
import { getMidheaven } from "@/lib/astro/midheaven";
import { toSidereal } from "@/lib/astro/ayanamsa";
import type { GeoLocation } from "@/lib/astro/location";

export type ZodiacMode = "tropical" | "sidereal";

export interface AstroState {
  now: Date;
  mode: ZodiacMode;
  setMode: (mode: ZodiacMode) => void;
  planets: PlanetPosition[];
  ascendant: number;
  descendant: number;
  midheaven: number;
}

const REFRESH_MS = 60_000;

/** Nothing meaningfully changes in a wheel like this faster than once a minute. */
export function useAstroState(location: GeoLocation | null): AstroState {
  const [mode, setMode] = useState<ZodiacMode>("tropical");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const tropicalPlanets = useMemo(() => getAllPlanetPositions(now), [now]);

  const planets = useMemo(() => {
    if (mode === "tropical") return tropicalPlanets;
    return tropicalPlanets.map((planet) => ({
      ...planet,
      eclipticLongitude: toSidereal(planet.eclipticLongitude, now),
    }));
  }, [tropicalPlanets, mode, now]);

  const { ascendant, descendant } = useMemo(() => {
    if (!location) return { ascendant: 0, descendant: 180 };
    const tropical = getAscendant(now, location);
    if (mode === "tropical") return tropical;
    return {
      ascendant: toSidereal(tropical.ascendant, now),
      descendant: toSidereal(tropical.descendant, now),
    };
  }, [location, now, mode]);

  const midheaven = useMemo(() => {
    if (!location) return 90;
    const tropical = getMidheaven(now, location).midheaven;
    return mode === "tropical" ? tropical : toSidereal(tropical, now);
  }, [location, now, mode]);

  return { now, mode, setMode, planets, ascendant, descendant, midheaven };
}
