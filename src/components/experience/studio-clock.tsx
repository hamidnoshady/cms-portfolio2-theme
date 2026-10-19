"use client";

import { useEffect, useState } from "react";

/**
 * Corner clock: city in sans, time in mono at 40% opacity, blinking colon.
 * Fixed bottom-right at the grid edge.
 */
export function StudioClock({
  label,
  timezone,
  hidden,
}: {
  label: string;
  timezone: string;
  hidden?: boolean;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const text = now
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now)
    : "--:--:--";
  const [hh = "--", mm = "--", ss = "--"] = text.split(":");

  return (
    <p
      className="t-clock fixed z-[44] m-0"
      style={{
        right: "var(--site-grid-edge)",
        bottom: "var(--site-grid-edge)",
        color: "#2e2e2e",
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
        transition: "opacity .52s cubic-bezier(.65,0,.35,1)",
      }}
    >
      <span className="inline-flex items-center whitespace-nowrap">
        <span className="mr-[6px] inline-block min-w-[3ch] text-left font-sans">{label}</span>
        <span
          className="inline-flex items-center justify-end font-mono tabular-nums"
          style={{ opacity: 0.4 }}
          suppressHydrationWarning
        >
          <span className="clock-roll">
            <span key={hh}>{hh}</span>
          </span>
          <span className="colon-blink inline-block min-w-[0.38em] text-center">:</span>
          <span className="clock-roll">
            <span key={mm}>{mm}</span>
          </span>
          <span className="colon-blink inline-block min-w-[0.38em] text-center">:</span>
          <span className="clock-roll">
            <span key={ss}>{ss}</span>
          </span>
        </span>
      </span>
    </p>
  );
}
