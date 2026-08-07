"use client";

import { useMemo } from "react";
import { getWholeSignHouses, getPlacidusHouses, type HouseCusp, type HouseSystem } from "@/lib/astro/houses";
import { toSidereal } from "@/lib/astro/ayanamsa";
import type { GeoLocation } from "@/lib/astro/location";
import type { ZodiacMode } from "./useAstroState";

/**
 * Shared by the wheel and any dashboard card that needs the same house
 * cusps it's currently showing (e.g. a natal positions table) - a single
 * source of truth for the Whole Sign/Placidus choice and its fallback.
 *
 * Whole Sign cusps are a pure function of the ascendant - already computed
 * upstream in whichever zodiac mode is active, tropical or sidereal - so
 * that needs no separate mode handling of its own. Placidus, unlike Whole
 * Sign, computes fresh from RAMC/obliquity/latitude rather than from the
 * already-mode-adjusted ascendant, so its own raw (always tropical) cusps
 * need their own sidereal conversion here when applicable. It also silently
 * falls back to Whole Sign wherever it's unavailable - no location, or above
 * the Arctic/Antarctic circle, where its underlying arc equation breaks down.
 */
export function useHouseCusps(
  system: HouseSystem,
  date: Date,
  location: GeoLocation | null,
  ascendant: number,
  mode: ZodiacMode,
): HouseCusp[] {
  return useMemo(() => {
    if (system === "placidus" && location) {
      const tropicalCusps = getPlacidusHouses(date, location);
      if (tropicalCusps) {
        return mode === "tropical" ? tropicalCusps : tropicalCusps.map((cusp) => ({ ...cusp, longitude: toSidereal(cusp.longitude, date) }));
      }
    }
    return getWholeSignHouses(ascendant);
  }, [system, date, location, ascendant, mode]);
}
