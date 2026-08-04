import type { ReactNode } from "react";
import { SEVERITY_COLORS, type MetricDescription } from "@/lib/severity";

/**
 * One row of a `grid-cols-[auto_auto_1fr]` metric grid: label, value, and a
 * trailing bit of grey text that gets whatever space is left over. Using a
 * flexible last column (rather than a plain 2-column grid) is what stops
 * longer description text from wrapping - the label/value columns only take
 * the width they need.
 *
 * All rows within a card should go through this one component so their
 * columns are computed together and actually line up - splitting a card's
 * rows across multiple separate grids (as an earlier pass did) means each
 * grid sizes its columns independently and the rows stop aligning.
 *
 * `description` colors the value by severity and shows its label trailing
 * (e.g. UV index, AQI). `note` is for trailing text with no severity concept
 * (e.g. a pressure trend arrow, a rise/set azimuth) - it doesn't affect the
 * value's color. Pass at most one of the two.
 */
export function MetricRow({
  name,
  value,
  description,
  note,
}: {
  name: string;
  value: ReactNode;
  description?: MetricDescription;
  note?: string;
}) {
  return (
    <>
      <div className="text-neutral-400 whitespace-nowrap">{name}</div>
      <div className="whitespace-nowrap" style={description ? { color: SEVERITY_COLORS[description.severity] } : undefined}>
        {value}
      </div>
      <div className="text-xs text-neutral-400">{description?.label ?? note}</div>
    </>
  );
}

/** A value with a unit suffix (e.g. "1013.2 hPa", or "45%" with `spaced`
 * false) - the unit rendered smaller and muted so it doesn't compete with
 * the number for attention or width, on the same line rather than wrapping
 * under it. */
export function ValueWithUnit({ value, unit, spaced = true }: { value: string; unit: string; spaced?: boolean }) {
  return (
    <>
      {value}
      {spaced ? " " : ""}
      <span className="text-xs text-neutral-500">{unit}</span>
    </>
  );
}
