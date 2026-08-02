"use client";

import type { UseLocationResult } from "@/lib/hooks/useLocation";
import { Card } from "./Card";

export function LocationCard({ location, loading, error, requestGeolocation }: UseLocationResult) {
  return (
    <Card title="Location">
      {location ? (
        <div className="text-sm">
          {location.label || `${location.latitude.toFixed(3)}°, ${location.longitude.toFixed(3)}°`}
        </div>
      ) : loading ? (
        <div className="text-sm text-neutral-400">Locating…</div>
      ) : (
        <div className="text-sm text-neutral-400">
          {error ?? "Location unavailable."}{" "}
          <button type="button" onClick={requestGeolocation} className="underline hover:text-neutral-200">
            Retry
          </button>
        </div>
      )}
    </Card>
  );
}
