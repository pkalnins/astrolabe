"use client";

import { useEffect, useState } from "react";
import type { UseLocationResult } from "@/lib/hooks/useLocation";
import { Card } from "./Card";

export function ClockCard({ locationState }: { locationState: UseLocationResult }) {
  const [now, setNow] = useState<Date | null>(null);
  const { location, loading, error, requestGeolocation } = locationState;

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 1000);
    const initial = setTimeout(tick, 0);
    return () => {
      clearInterval(id);
      clearTimeout(initial);
    };
  }, []);

  return (
    <Card>
      {now ? (
        <>
          <div className="text-3xl font-mono tabular-nums">{now.toLocaleTimeString()}</div>
          <div className="text-sm text-neutral-400">
            {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </>
      ) : (
        <div className="text-3xl font-mono tabular-nums text-neutral-600">--:--:--</div>
      )}

      <div className="mt-4">
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
      </div>
    </Card>
  );
}
