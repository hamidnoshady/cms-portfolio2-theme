"use client";

import type { View } from "@/components/experience/types";

/**
 * Fixed centre wordmark: two pieces — the first in muted grey, the second
 * in full ink. The whole thing blurs/fades per active view.
 * Lowercase like the reference: "estudio bang" / "alba estudi".
 */
export function CenterWordmark({
  pieces,
  view,
  dimmed,
}: {
  pieces: [string, string];
  view: View;
  dimmed: boolean;
}) {
  let filter = "blur(0px)";
  let opacity = 1;

  switch (view.name) {
    case "index":
    case "case":
    case "contact":
      filter = "blur(9px)";
      opacity = 0;
      break;
    case "legal":
      filter = "blur(23px)";
      opacity = 0.42;
      break;
    case "about":
      /* Starts blurred, sharpens as user scrolls into the about surface */
      filter = "blur(0px)";
      opacity = 1;
      break;
    case "home":
      break;
  }
  if (dimmed) {
    filter = "blur(10px)";
    opacity = 0.52;
  }

  return (
    <h1
      aria-hidden
      className="pointer-events-none fixed left-1/2 top-1/2 z-[2] m-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
      style={{
        fontSize: "clamp(48px, 5.14vw, 74px)",
        fontWeight: 500,
        letterSpacing: "-0.04em",
        lineHeight: "76px",
        filter,
        opacity,
        transition:
          "filter .76s cubic-bezier(.65,0,.35,1), opacity .76s cubic-bezier(.65,0,.35,1)",
        fontFeatureSettings: '"ss01" 1',
      }}
    >
      <span style={{ color: "var(--muted)", fontWeight: 500 }}>{pieces[0]}</span>
      <strong className="font-medium" style={{ color: "var(--text)" }}>
        {pieces[1]}
      </strong>
    </h1>
  );
}
