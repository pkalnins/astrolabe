"use client";

import { useEffect, useState } from "react";
import type { GeocodeResponse, GeocodeResult } from "@/app/api/geocode/route";
import type { NatalData, UseNatalDataResult } from "@/lib/hooks/useNatalData";
import { Card } from "./Card";

const SEARCH_DEBOUNCE_MS = 300;

const INPUT_CLASS =
  "w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none";

function formatBirthSummary(data: NatalData): string {
  const [year, month, day] = data.date.split("-").map(Number);
  const [hour, minute] = data.time.split(":").map(Number);
  // Rendered as plain wall-clock components (no timezone conversion) - this
  // is just redisplaying exactly what the user typed in, not the derived UTC
  // instant, so a UTC-based Date/Intl call here would risk shifting the
  // displayed day depending on the browser's own local zone.
  const date = new Date(year, month - 1, day);
  const dateLabel = date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const hour12 = ((hour + 11) % 12) + 1;
  const period = hour < 12 ? "AM" : "PM";
  const timeLabel = `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
  return `${dateLabel} · ${timeLabel} · ${data.label}`;
}

function BirthDataForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: NatalData | null;
  onSave: (data: NatalData) => void;
  onCancel: (() => void) | null;
}) {
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [query, setQuery] = useState(initial?.label ?? "");
  const [selectedPlace, setSelectedPlace] = useState<GeocodeResult | null>(
    initial ? { id: 0, label: initial.label, latitude: initial.latitude, longitude: initial.longitude, timezone: initial.timezone } : null,
  );
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Any edit to the search box invalidates a previously selected place - the
  // user is typing a new search, not just re-confirming the old one. Setting
  // `searching` here (in the event handler, not the effect below) is what
  // makes the "Searching…" indicator appear the instant they type, not only
  // once the debounce timer actually fires.
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedPlace(null);
    setSearching(Boolean(value.trim()));
  };

  useEffect(() => {
    // No setSuggestions([]) here - the render guard below already hides the
    // dropdown once the query is empty or a place is selected, so a stale
    // array in state is harmless and doesn't need clearing.
    if (!query.trim() || selectedPlace) {
      return;
    }
    const controller = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: GeocodeResponse) => setSuggestions(data.results ?? []))
        .catch(() => {})
        .finally(() => {
          // Skip a stale/aborted request's own completion - otherwise it can
          // race a newer keystroke's already-true `searching` flag and flip
          // it back off before that request has actually finished.
          if (!controller.signal.aborted) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [query, selectedPlace]);

  const canSave = Boolean(date && time && selectedPlace);
  // Surfaced next to Save so a disabled button never just silently does
  // nothing - most commonly hit by typing a city but not clicking one of
  // the dropdown suggestions, which is easy to miss since typing alone
  // looks like it should be enough.
  const missingFields: string[] = [];
  if (!date) missingFields.push("birth date");
  if (!time) missingFields.push("birth time");
  if (!selectedPlace) missingFields.push(query.trim() ? "a place selected from the list below" : "birth place");

  return (
    <div className="flex flex-col gap-2 text-sm">
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Birth date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_CLASS} />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Birth time</span>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={INPUT_CLASS} />
      </label>
      <label className="relative flex flex-col gap-0.5">
        <span className="text-xs text-neutral-400">Birth place</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search for a city…"
          className={INPUT_CLASS}
        />
        {query && !selectedPlace && (searching || suggestions.length > 0) && (
          <ul className="absolute top-full left-0 z-10 mt-1 max-h-48 w-full overflow-y-auto rounded border border-neutral-700 bg-neutral-800 shadow-xl">
            {searching && suggestions.length === 0 && <li className="px-2 py-1 text-xs text-neutral-400">Searching…</li>}
            {suggestions.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlace(result);
                    setQuery(result.label);
                    setSuggestions([]);
                  }}
                  className="w-full px-2 py-1 text-left text-neutral-200 hover:bg-neutral-700"
                >
                  {result.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          disabled={!canSave}
          onClick={() =>
            selectedPlace &&
            onSave({
              label: selectedPlace.label,
              latitude: selectedPlace.latitude,
              longitude: selectedPlace.longitude,
              timezone: selectedPlace.timezone,
              date,
              time,
            })
          }
          className="rounded border border-neutral-600 px-3 py-1 text-xs uppercase tracking-wide text-neutral-300 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-neutral-400 hover:text-neutral-200">
            Cancel
          </button>
        )}
      </div>
      {!canSave && missingFields.length > 0 && <div className="text-xs text-neutral-500">Needs: {missingFields.join(", ")}.</div>}
    </div>
  );
}

export function NatalChartCard({ natalState }: { natalState: UseNatalDataResult }) {
  const { natalData, setNatalData, clearNatalData } = natalState;
  const [editing, setEditing] = useState(false);

  return (
    <Card title="Natal Chart">
      {editing || !natalData ? (
        <BirthDataForm
          initial={natalData}
          onSave={(data) => {
            setNatalData(data);
            setEditing(false);
          }}
          onCancel={natalData ? () => setEditing(false) : null}
        />
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          <div className="text-neutral-200">{formatBirthSummary(natalData)}</div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-neutral-400 underline hover:text-neutral-200">
              Edit
            </button>
            <button type="button" onClick={clearNatalData} className="text-xs text-neutral-400 underline hover:text-neutral-200">
              Remove
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
