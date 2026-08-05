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
 *
 * `stacked` drops the label/description onto its own row below, aligned
 * under the value's column rather than squeezed into the narrow remainder
 * of the same row - for narrower contexts (e.g. the wheel's hover tooltips)
 * where that third column doesn't have enough room to hold real text.
 *
 * `nameColor` overrides the label's default neutral color (e.g. distinguishing
 * "Rise" from "Set" at a glance) - it doesn't affect the value or trailing text.
 */
export function MetricRow({
  name,
  value,
  description,
  note,
  stacked = false,
  nameColor,
}: {
  name: string;
  value: ReactNode;
  description?: MetricDescription;
  note?: string;
  stacked?: boolean;
  nameColor?: string;
}) {
  const trailing = description?.label ?? note;
  const valueColor = description ? { color: SEVERITY_COLORS[description.severity] } : undefined;
  const nameStyle = nameColor ? { color: nameColor } : undefined;

  if (stacked) {
    return (
      <>
        <div className="text-neutral-400 whitespace-nowrap" style={nameStyle}>
          {name}
        </div>
        <div className="whitespace-nowrap" style={valueColor}>
          {value}
        </div>
        {trailing && <div className="col-span-2 col-start-2 -mt-0.5 text-xs text-neutral-400">{trailing}</div>}
      </>
    );
  }

  return (
    <>
      <div className="text-neutral-400 whitespace-nowrap" style={nameStyle}>
        {name}
      </div>
      <div className="whitespace-nowrap" style={valueColor}>
        {value}
      </div>
      <div className="min-w-0 text-xs text-neutral-400 break-words">{trailing}</div>
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
