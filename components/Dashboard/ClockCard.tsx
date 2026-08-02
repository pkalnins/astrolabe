"use client";

import { useEffect, useState } from "react";
import { Card } from "./Card";

export function ClockCard() {
  const [now, setNow] = useState<Date | null>(null);

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
    <Card title="Date & Time">
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
    </Card>
  );
}
