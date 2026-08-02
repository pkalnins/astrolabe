import * as Astronomy from "astronomy-engine";

export interface UpcomingEvent {
  name: string;
  date: Date;
}

function nextMoonQuarterEvent(date: Date, quarter: 0 | 2, name: string): UpcomingEvent {
  let mq = Astronomy.SearchMoonQuarter(date);
  while (mq.quarter !== quarter) {
    mq = Astronomy.NextMoonQuarter(mq);
  }
  return { name, date: mq.time.date };
}

export function getNextNewMoon(date: Date): UpcomingEvent {
  return nextMoonQuarterEvent(date, 0, "New Moon");
}

export function getNextFullMoon(date: Date): UpcomingEvent {
  return nextMoonQuarterEvent(date, 2, "Full Moon");
}

/** Next equinox or solstice, whichever comes first, crossing into next year if needed. */
export function getNextSeason(date: Date): UpcomingEvent {
  const seasonsThisYear = Astronomy.Seasons(date.getUTCFullYear());
  const candidates: UpcomingEvent[] = [
    { name: "March Equinox", date: seasonsThisYear.mar_equinox.date },
    { name: "June Solstice", date: seasonsThisYear.jun_solstice.date },
    { name: "September Equinox", date: seasonsThisYear.sep_equinox.date },
    { name: "December Solstice", date: seasonsThisYear.dec_solstice.date },
  ];

  const future = candidates.filter((c) => c.date.getTime() > date.getTime());
  if (future.length > 0) {
    return future.reduce((earliest, c) => (c.date < earliest.date ? c : earliest));
  }
  const nextYear = Astronomy.Seasons(date.getUTCFullYear() + 1);
  return { name: "March Equinox", date: nextYear.mar_equinox.date };
}

function lunarEclipseLabel(kind: Astronomy.EclipseKind): string {
  switch (kind) {
    case Astronomy.EclipseKind.Total:
      return "Total Lunar Eclipse";
    case Astronomy.EclipseKind.Partial:
      return "Partial Lunar Eclipse";
    default:
      return "Penumbral Lunar Eclipse";
  }
}

/**
 * Next lunar eclipse (of any kind - penumbral, partial, or total), visible
 * from wherever the Moon is above the horizon at that moment (roughly half
 * of Earth), not necessarily the user's specific location.
 */
export function getNextLunarEclipse(date: Date): UpcomingEvent {
  const eclipse = Astronomy.SearchLunarEclipse(date);
  return { name: lunarEclipseLabel(eclipse.kind), date: eclipse.peak.date };
}
