import type { ReactNode } from "react";

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900/60 p-3">
      {title && <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-blue-400 uppercase">{title}</h2>}
      <div className="text-neutral-100">{children}</div>
    </div>
  );
}
