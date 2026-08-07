"use client";

import { useCallback, useState } from "react";

export interface NatalData {
  /** Display label for the birth place, e.g. "Portland, Oregon, United States". */
  label: string;
  latitude: number;
  longitude: number;
  /** IANA zone at the birth place - resolves the wall-clock birth time to a UTC instant. */
  timezone: string;
  /** Wall-clock birth date, "YYYY-MM-DD". */
  date: string;
  /** Wall-clock birth time, "HH:mm" (24-hour). */
  time: string;
}

const STORAGE_KEY = "astrolabe:natal";

function readStoredNatalData(): NatalData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NatalData;
  } catch {
    return null;
  }
}

export interface UseNatalDataResult {
  natalData: NatalData | null;
  setNatalData: (data: NatalData) => void;
  clearNatalData: () => void;
}

/** Persists the user's own birth data (date/time/place) for the natal ring. */
export function useNatalData(): UseNatalDataResult {
  const [natalData, setNatalDataState] = useState<NatalData | null>(readStoredNatalData);

  const setNatalData = useCallback((data: NatalData) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setNatalDataState(data);
  }, []);

  const clearNatalData = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setNatalDataState(null);
  }, []);

  return { natalData, setNatalData, clearNatalData };
}
