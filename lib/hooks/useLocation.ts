"use client";

import { useCallback, useEffect, useState } from "react";
import type { GeoLocation } from "@/lib/astro/location";
import type { ReverseGeocodeResponse } from "@/app/api/reverse-geocode/route";

const STORAGE_KEY = "astrolabe:location";

interface StoredLocation extends GeoLocation {
  /** "" means a reverse-geocode lookup ran and found no city name (so don't retry it). */
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

  // Backfill a city label whenever we have coordinates but haven't looked one
  // up yet (a fresh geolocation fix, or a location saved before this existed).
  useEffect(() => {
    if (!location || location.label !== undefined) return;
    let cancelled = false;

    fetch(`/api/reverse-geocode?latitude=${location.latitude}&longitude=${location.longitude}`)
      .then((res) => res.json())
      .then((data: ReverseGeocodeResponse) => {
        if (cancelled) return;
        const next: StoredLocation = { ...location, label: data.label ?? "" };
        writeStoredLocation(next);
        setLocationState(next);
      })
      .catch(() => {
        // Non-fatal: the UI just falls back to showing coordinates.
      });

    return () => {
      cancelled = true;
    };
  }, [location]);

  return { location, loading, error, setLocation, requestGeolocation };
}
