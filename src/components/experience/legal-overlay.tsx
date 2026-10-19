"use client";

import type { LegalSection } from "@/db/schema";
import { paragraphs } from "@/lib/text";

/**
 * Legal surface: a giant bold display title (difference blend) parked over
 * the top of the page, resolving from a blur, with the legal prose in one
 * centred 18px column beneath it — the reference legal composition.
 */
export function LegalOverlay({ sections, onClose }: { sections: LegalSection[]; onClose: () => void }) {
  return (
    <div className="surface-scroll z-[40]" style={{ background: "var(--site-bg)" }}>
      {/* Close */}
      <div
        className="sticky z-[74] ml-auto flex w-max items-center"
        style={{ top: "var(--site-grid-edge)", marginRight: "var(--site-grid-edge)" }}
      >
        <button
          onClick={onClose}
          className="text-[14px] font-semibold uppercase tracking-[-0.02em] text-black/50 hover:text-black"
          data-cursor="nav"
          data-cursor-text="Close"
        >
          Close
        </button>
      </div>

      {/* Title */}
      <h2
        className="m-0 px-[var(--site-grid-edge)] font-bold text-black fade-up"
        style={{
          fontSize: "clamp(36px, 7.19vw, 80px)",
          letterSpacing: "-0.04em",
          lineHeight: 1,
          marginTop: "clamp(80px, 14vh, 160px)",
        }}
      >
        Legal
      </h2>

      {/* Centred prose column */}
      <div
        className="mx-auto text-black fade-up"
        style={{
          maxWidth: "min(556px, calc(100vw - var(--site-grid-edge) * 2))",
          paddingTop: "clamp(40px, 6vh, 80px)",
          paddingBottom: "max(32vh, 120px)",
          paddingInline: "var(--site-grid-edge)",
          fontSize: "clamp(14px, 2vw, 18px)",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          lineHeight: 1.4,
          animationDelay: ".12s",
        }}
      >
        <h3 className="sr-only">Legal</h3>
        {sections.map((s) => (
          <section key={s.id} id={s.anchor} className="block">
            <h4
              className="m-0 mb-[1.2em]"
              style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2 }}
            >
              {s.heading}
            </h4>
            {paragraphs(s.body).map((p) => (
              <p key={p.slice(0, 24)} className="m-0 mb-[1.2em] whitespace-pre-line">
                {p}
              </p>
            ))}
          </section>
        ))}
        <p className="m-0" style={{ opacity: 0.4 }}>
          Last review — {new Date().getFullYear()}. Questions: use the contact form.
        </p>
      </div>
    </div>
  );
}
