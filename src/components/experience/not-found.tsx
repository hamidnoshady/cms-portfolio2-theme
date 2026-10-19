"use client";

import { BlockMark } from "@/components/experience/chrome";
import { ExperienceCursor } from "@/components/experience/cursor";
import Link from "next/link";

/**
 * 404: fixed centred wordmark with ghost 404 numerals orbiting it —
 * composed like the reference not-found treatment.
 */
export function NotFoundExperience({
  pieces,
  routes,
}: {
  pieces: [string, string];
  routes: { href: string; label: string }[];
}) {
  return (
    <div className="min-h-svh" style={{ background: "var(--bg)" }}>
      <ExperienceCursor />

      <Link
        href="/"
        className="fixed z-[12] inline-flex text-[#111]"
        style={{ left: "var(--site-grid-edge)", top: "var(--site-grid-edge)" }}
        aria-label="Home"
        data-cursor
      >
        <BlockMark />
      </Link>

      <h1
        className="pointer-events-none fixed left-1/2 top-1/2 z-[2] m-0 flex -translate-x-1/2 -translate-y-1/2 items-baseline whitespace-nowrap font-medium"
        style={{
          fontSize: "clamp(48px, 5.14vw, 74px)",
          letterSpacing: "-0.04em",
          lineHeight: 1,
          columnGap: ".16em",
          color: "#111",
        }}
      >
        <span style={{ color: "#aaa" }}>{pieces[0]}</span>
        <span aria-hidden style={{ flex: "0 0 .4em" }} />
        <strong className="font-medium">{pieces[1]}</strong>
        <span
          aria-hidden
          className="t-display"
          style={{ color: "#c7161d", fontSize: "0.32em", marginLeft: ".6em" }}
        >
          404
        </span>
      </h1>

      <nav
        aria-label="Lost? Go to"
        className="fixed z-[5] flex flex-col gap-[8px]"
        style={{ left: "var(--site-grid-edge)", top: "50%", transform: "translateY(-50%)" }}
      >
        {routes.map((r, i) => (
          <Link key={r.href} href={r.href} className="flex items-baseline" data-cursor>
            <span className="t-index-num mr-[8px] w-[13px]" style={{ opacity: 0.3 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="t-card-title whitespace-nowrap" style={{ opacity: 0.75 }}>
              {r.label}
            </span>
          </Link>
        ))}
      </nav>

      <p
        className="pointer-events-none fixed z-[5] m-0 flex w-full justify-center"
        style={{
          left: 0,
          bottom: "var(--site-grid-edge)",
          fontSize: 11,
          lineHeight: 1,
          color: "#aaa",
        }}
      >
        This page was never drawn — pick a door and keep walking.
      </p>
    </div>
  );
}
