"use client";

import { useMemo } from "react";
import { getAllPlanetPositions, type PlanetPosition } from "@/lib/astro/positions";
import { getLunarNodes, type LunarNodes } from "@/lib/astro/lunarNodes";
import { getAscendant } from "@/lib/astro/ascendant";
import { getMidheaven } from "@/lib/astro/midheaven";
import { toSidereal } from "@/lib/astro/ayanamsa";
import { zonedTimeToUtc } from "@/lib/astro/timezone";
import type { GeoLocation } from "@/lib/astro/location";
import type { ZodiacMode } from "./useAstroState";
import type { NatalData } from "./useNatalData";

export interface NatalChart {
  birthInstant: Date;
  /** The birth place - needed (not just the ascendant) for a Placidus house
      recalculation whenever the wheel is anchored to this chart's angles. */
  location: GeoLocation;
  planets: PlanetPosition[];
  lunarNodes: LunarNodes;
  /** From the birth place/time - always fixed at birth, never recalculated
      for wherever the person is currently located (see useAstroState's own
      ascendant/midheaven for the *current*-location equivalents). */
  ascendant: number;
  descendant: number;
  midheaven: number;
}

function parseBirthInstant(natalData: NatalData): Date | null {
  const [year, month, day] = natalData.date.split("-").map(Number);
  const [hour, minute] = natalData.time.split(":").map(Number);
  if ([year, month, day, hour, minute].some((n) => !Number.isFinite(n))) return null;
  return zonedTimeToUtc(year, month, day, hour, minute, natalData.timezone);
}

/** Derives natal planet/lunar-node positions from stored birth data - geocentric,
    so (unlike ascendant/midheaven) these don't depend on the *current* location. */
export function useNatalChart(natalData: NatalData | null, mode: ZodiacMode): NatalChart | null {
  return useMemo(() => {
    if (!natalData) return null;
    const birthInstant = parseBirthInstant(natalData);
    if (!birthInstant) return null;

    const tropicalPlanets = getAllPlanetPositions(birthInstant);
    const tropicalNodes = getLunarNodes(birthInstant);
    const birthLocation = { latitude: natalData.latitude, longitude: natalData.longitude };
    const tropicalAngles = getAscendant(birthInstant, birthLocation);
    const tropicalMidheaven = getMidheaven(birthInstant, birthLocation).midheaven;

    if (mode === "tropical") {
      return {
        birthInstant,
        location: birthLocation,
        planets: tropicalPlanets,
        lunarNodes: tropicalNodes,
        ascendant: tropicalAngles.ascendant,
        descendant: tropicalAngles.descendant,
        midheaven: tropicalMidheaven,
      };
    }

    return {
      birthInstant,
      location: birthLocation,
      planets: tropicalPlanets.map((planet) => ({
        ...planet,
        eclipticLongitude: toSidereal(planet.eclipticLongitude, birthInstant),
      })),
      lunarNodes: {
        northNodeLongitude: toSidereal(tropicalNodes.northNodeLongitude, birthInstant),
        southNodeLongitude: toSidereal(tropicalNodes.southNodeLongitude, birthInstant),
      },
      ascendant: toSidereal(tropicalAngles.ascendant, birthInstant),
      descendant: toSidereal(tropicalAngles.descendant, birthInstant),
      midheaven: toSidereal(tropicalMidheaven, birthInstant),
    };
  }, [natalData, mode]);
}
