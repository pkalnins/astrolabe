// Converts a birth date/time entered as wall-clock values in some IANA zone
// (e.g. a form field showing "3:42 PM" for a city search result's timezone)
// into the correct UTC instant - the piece `Date` itself can't do, since it
// only ever constructs from local-system-time or UTC components.
//
// Standard trick (no date library needed): guess the instant by treating the
// wall-clock components as if they were already UTC, see what wall-clock
// time that guess actually renders as in the target zone, and shift by the
// difference. One correction pass isn't quite enough within a few minutes of
// a DST transition (the offset itself changes between the first guess and
// the corrected one), so this iterates until the guess stops moving.
function wallTimeInZoneAsUtcMs(instantMs: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(instantMs)).map((p) => [p.type, p.value]));
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
}

export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  let guessMs = Date.UTC(year, month - 1, day, hour, minute);

  // Two passes converge in all but the most pathological cases: the first
  // gets within one offset-change of the truth, the second corrects for that
  // change. A third pass would only matter for a timezone whose offset
  // changes twice within the same few minutes, which doesn't happen.
  for (let i = 0; i < 3; i++) {
    const renderedMs = wallTimeInZoneAsUtcMs(guessMs, timeZone);
    const errorMs = renderedMs - Date.UTC(year, month - 1, day, hour, minute);
    if (errorMs === 0) break;
    guessMs -= errorMs;
  }

  return new Date(guessMs);
}
