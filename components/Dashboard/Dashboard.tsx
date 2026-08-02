"use client";

import type { UseLocationResult } from "@/lib/hooks/useLocation";
import { ClockCard } from "./ClockCard";
import { LocationCard } from "./LocationCard";
import { SunMoonCard } from "./SunMoonCard";
import { WeatherCard } from "./WeatherCard";
import { SolarWeatherCard } from "./SolarWeatherCard";

export function Dashboard({ locationState, now }: { locationState: UseLocationResult; now: Date }) {
  const { location } = locationState;

  return (
    <div className="flex flex-col gap-4">
      <ClockCard />
      <LocationCard {...locationState} />
      <SunMoonCard location={location} now={now} />
      <WeatherCard location={location} />
      <SolarWeatherCard />
    </div>
  );
}
