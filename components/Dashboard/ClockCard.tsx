"use client";

import { useEffect, useMemo, useState } from "react";
import type { UseLocationResult } from "@/lib/hooks/useLocation";
import { getPlanetaryHour } from "@/lib/astro/planetaryHours";
import { PLANET_GLYPHS, PLANET_COLORS } from "@/components/SkyWheel/glyphs";
import { Card } from "./Card";

const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

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

  const hour = useMemo(() => {
    if (!location || !now) return null;
    try {
      return getPlanetaryHour(now, location);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, now]);

  return (
    <Card>
      {now ? (
        <>
          <div className="text-4xl font-mono tabular-nums" style={{ color: PLANET_COLORS.Sun }}>
            {TIME_FORMATTER.formatToParts(now).map((part, i) =>
              part.type === "dayPeriod" ? (
                <span key={i} className="text-xl">
                  {part.value}
                </span>
              ) : (
                <span key={i}>{part.value}</span>
              ),
            )}
          </div>
          <div className="text-sm text-neutral-400">
            {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <div className="text-xs text-neutral-500">
            {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC" })} UTC
          </div>
        </>
      ) : (
        <div className="text-4xl font-mono tabular-nums text-neutral-600">--:--</div>
      )}

      <div className="mt-2">
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

      {location && hour && (
        <div className="mt-2 flex items-center gap-1.5 text-xs whitespace-nowrap">
          <span className="text-neutral-400">Planetary hour:</span>
          <span className="leading-none" style={{ color: PLANET_COLORS[hour.ruler] }}>
            {PLANET_GLYPHS[hour.ruler]}
          </span>
          <span style={{ color: PLANET_COLORS[hour.ruler] }}>{hour.ruler}</span>
          <span className="text-neutral-400">
            · {hour.isDaytime ? "Day" : "Night"} hour {hour.isDaytime ? hour.hourNumber : hour.hourNumber - 12} of 12
          </span>
        </div>
      )}
    </Card>
  );
}
