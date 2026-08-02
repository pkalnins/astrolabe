import type { UpcomingEvent } from "@/lib/astro/skyEvents";

export function formatUpcomingEvent(event: UpcomingEvent, now: Date): { date: string; daysUntil: string } {
  const date = event.date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const days = Math.round((event.date.getTime() - now.getTime()) / 86_400_000);
  const daysUntil = days <= 0 ? "today" : days === 1 ? "in 1 day" : `in ${days} days`;
  return { date, daysUntil };
}
