"use client";

import { useCallback, useEffect, useState } from "react";
import type { GeoLocation } from "@/lib/astro/location";

const STORAGE_KEY = "astrolabe:location";

interface StoredLocation extends GeoLocation {
  label?: string;
}

function readStoredLocation(): StoredLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredLocation;
  } catch {
    return null;
  }
}

function writeStoredLocation(location: StoredLocation) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
}

export interface UseLocationResult {
  location: StoredLocation | null;
  loading: boolean;
  error: string | null;
  /** Manually set (and persist) the location, e.g. from a settings form. */
  setLocation: (location: StoredLocation) => void;
  /** Re-request the browser's geolocation and persist the result. */
  requestGeolocation: () => void;
}

/**
 * Resolves the observer location for the astro/weather calculations.
 *
 * On an always-on kiosk display we don't want a permission prompt on every
 * reload, so a previously saved location (from geolocation or manual entry)
 * takes priority; geolocation is only requested when nothing is saved yet.
 */
export function useLocation(): UseLocationResult {
  const [location, setLocationState] = useState<StoredLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestGeolocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      setLoading(false);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: StoredLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          elevation: position.coords.altitude ?? undefined,
        };
        writeStoredLocation(next);
        setLocationState(next);
        setError(null);
        setLoading(false);
      },
      (geoError) => {
        setError(geoError.message);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: Infinity },
    );
  }, []);

  useEffect(() => {
    const stored = readStoredLocation();
    const id = setTimeout(() => {
      if (stored) {
        setLocationState(stored);
        setLoading(false);
      } else {
        requestGeolocation();
      }
    }, 0);
    return () => clearTimeout(id);
  }, [requestGeolocation]);

  const setLocation = useCallback((next: StoredLocation) => {
    writeStoredLocation(next);
    setLocationState(next);
    setError(null);
  }, []);

  return { location, loading, error, setLocation, requestGeolocation };
}
