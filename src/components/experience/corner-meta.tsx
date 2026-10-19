"use client";

import { useEffect, useState } from "react";

function ClockRow({ label, timezone }: { label: string; timezone: string }) {
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
        hour12: false,
      }).format(now)
    : "--:--";
  const [hh = "--", mm = "--"] = text.split(":");

  return (
    <div className="inline-flex items-center whitespace-nowrap">
      <span className="mr-[6px] inline-block min-w-[3ch] text-left font-sans">{label}</span>
      <span className="font-mono tabular-nums opacity-40" suppressHydrationWarning>
        <span className="clock-roll"><span key={hh}>{hh}</span></span>
        <span className="inline-block min-w-[0.38em] text-center">:</span>
        <span className="clock-roll"><span key={mm}>{mm}</span></span>
      </span>
    </div>
  );
}

/** Bottom-right language toggles + two compact clocks. */
export function CornerMeta({
  primaryLanguage,
  secondaryLanguage,
  primaryClockLabel,
  primaryTimezone,
  secondaryClockLabel,
  secondaryTimezone,
  hidden,
}: {
  primaryLanguage: string;
  secondaryLanguage: string;
  primaryClockLabel: string;
  primaryTimezone: string;
  secondaryClockLabel: string;
  secondaryTimezone: string;
  hidden?: boolean;
}) {
  return (
    <div
      className="fixed z-[44] hidden flex-col items-end gap-[2px] min-[761px]:flex"
      style={{
        right: "var(--site-grid-edge)",
        bottom: "var(--site-grid-edge)",
        color: "#2e2e2e",
        fontSize: 11,
        lineHeight: 1.1,
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
        transition: "opacity .52s cubic-bezier(.65,0,.35,1)",
      }}
    >
      <div className="mb-[4px] inline-flex items-center gap-[6px] text-[11px] leading-none">
        <button className="opacity-100" data-cursor="nav" data-cursor-text={primaryLanguage}>{primaryLanguage}</button>
        <button className="opacity-25" data-cursor="nav" data-cursor-text={secondaryLanguage}>{secondaryLanguage}</button>
      </div>
      <ClockRow label={primaryClockLabel} timezone={primaryTimezone} />
      <ClockRow label={secondaryClockLabel} timezone={secondaryTimezone} />
    </div>
  );
}
