import { temperatureColor } from "@/lib/temperatureComfort";

export interface TemperatureSliderProps {
  low: number;
  high: number;
  current: number;
}

// Just the low<->high range and where today's reading sits in it - the
// number itself is shown above (next to the conditions), so this stays a
// compact visual rather than repeating text.
export function TemperatureSlider({ low, high, current }: TemperatureSliderProps) {
  const fillFraction = high === low ? 0.5 : Math.min(1, Math.max(0, (current - low) / (high - low)));
  const markerColor = temperatureColor(current);

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-400">
      <span>{Math.round(low)}°</span>
      <div className="relative h-3.5 flex-1">
        <div className="absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full bg-neutral-700" />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-neutral-900"
          style={{ left: `${fillFraction * 100}%`, background: markerColor }}
        />
      </div>
      <span>{Math.round(high)}°</span>
    </div>
  );
}
