"use client";

import type { View } from "@/components/experience/types";
import { useEffect, useState } from "react";

/** Geometric studio mark: a 3×2 block glyph. */
export function BlockMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 30 24"
      aria-hidden
      className={className}
      style={{ display: "block", height: 24, width: 30 }}
      fill="currentColor"
    >
      <rect x="0" y="0" width="9" height="11" />
      <rect x="10.5" y="0" width="9" height="11" opacity="0.35" />
      <rect x="21" y="0" width="9" height="11" />
      <rect x="0" y="13" width="9" height="11" opacity="0.35" />
      <rect x="10.5" y="13" width="9" height="11" />
      <rect x="21" y="13" width="9" height="11" opacity="0.35" />
    </svg>
  );
}

type NavProps = {
  view: View;
  navLabels: { key: View["name"]; label: string; target: View }[];
  onNav: (view: View) => void;
};

/**
 * Site chrome: logo mark top-left, comma-separated nav links top-right,
 * both fixed and white with mix-blend-mode:difference so they invert
 * over imagery. On mobile the nav collapses to a "Menu" toggle that
 * opens a compact right-aligned dropdown.
 */
export function SiteChrome({ view, navLabels, onNav }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const caseOpen = view.name === "case";

  useEffect(() => { setMenuOpen(false); }, [view]);

  return (
    <>
      <header
        className="fixed z-[80] flex items-start justify-between text-white mix-blend-difference"
        style={{
          left: "var(--site-grid-edge)",
          right: "var(--site-grid-edge)",
          top: "var(--site-grid-edge)",
          /* When case view is open, hide entire chrome so SHARE/CLOSE owns the top */
          opacity: caseOpen ? 0 : 1,
          pointerEvents: caseOpen ? "none" : "auto",
          transition: "opacity .32s cubic-bezier(.65,0,.35,1)",
        }}
      >
        {/* Logo mark */}
        <button
          aria-label="Home"
          onClick={() => onNav({ name: "home" })}
          className="inline-flex"
          data-cursor="nav"
          data-cursor-text="Home"
        >
          <BlockMark />
        </button>

        {/* Desktop nav: comma-separated, like the reference screenshot */}
        <nav
          className="hidden items-center min-[761px]:flex"
          style={{ gap: 0 }}
          aria-label="Primary"
        >
          {navLabels.map((l, i) => {
            const active = view.name === l.key || (l.key === "home" as View["name"] && view.name === "home");
            const isHome = l.key === "home";
            return (
              <span key={l.key} className="inline-flex items-center">
                <button
                  onClick={() => onNav(active && !isHome ? { name: "home" } : l.target)}
                  className="t-nav transition-opacity duration-200"
                  style={{
                    opacity: view.name === "home" ? 1 : active ? 1 : 0.2,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                  onMouseLeave={(e) => {
                    const o = view.name === "home" ? "1" : active ? "1" : "0.2";
                    e.currentTarget.style.opacity = o;
                  }}
                  data-cursor="nav"
                  data-cursor-text={l.label}
                >
                  {l.label}
                </button>
                {i < navLabels.length - 1 ? (
                  <span className="t-nav mx-[3px]" style={{ opacity: 0.35 }}>,</span>
                ) : (
                  <span className="t-nav" style={{ opacity: 0.35 }}>.</span>
                )}
              </span>
            );
          })}
        </nav>

        {/* Mobile toggle */}
        <button
          className="t-display min-[761px]:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          data-cursor="nav"
          data-cursor-text={menuOpen ? "Close" : "Menu"}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </header>

      {/* Mobile menu — frosted backdrop with reliable contrast */}
      {menuOpen ? (
        <div className="fixed inset-0 z-[90] min-[761px]:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          {/* Scrim — prevents background interaction */}
          <button
            aria-label="Close menu"
            className="absolute inset-0"
            onClick={() => setMenuOpen(false)}
            tabIndex={-1}
            style={{ background: "rgba(245,245,242,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
          />
          <nav
            aria-label="Mobile"
            className="absolute z-[3] flex flex-col items-end gap-[14px]"
            style={{ right: "var(--site-grid-edge)", top: 62, width: "min(60vw, 220px)" }}
          >
            {navLabels.map((l, i) => (
              <span key={l.key} className="block overflow-hidden">
                <button
                  tabIndex={0}
                  onClick={() => {
                    setMenuOpen(false);
                    onNav(l.target);
                  }}
                  className="inline-flex items-center text-right"
                  style={{
                    fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em",
                    lineHeight: 1.2, fontFeatureSettings: '"ss01" 1',
                    color: view.name === l.key ? "#141414" : "rgba(20,20,20,0.45)",
                    padding: "4px 0",
                    minHeight: 44, /* touch target */
                    animation: `slideUp .42s cubic-bezier(.65,0,.35,1) ${i * 0.04}s backwards`,
                  }}
                >
                  {l.label}
                </button>
              </span>
            ))}
          </nav>
        </div>
      ) : null}

      <style>{`@keyframes slideUp { from { transform: translateY(80%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </>
  );
}

/** Bottom-centre copyright line. */
export function SiteCopyright({
  studioName,
  onLegal,
  hidden,
}: {
  studioName: string;
  onLegal: () => void;
  hidden?: boolean;
}) {
  return (
    <p
      className="t-small fixed z-[44] m-0 hidden min-[761px]:block"
      style={{
        left: "50%", bottom: 32,
        transform: "translateX(-50%)",
        color: "#2e2e2e",
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
        transition: "opacity .52s cubic-bezier(.65,0,.35,1)",
        whiteSpace: "nowrap",
      }}
    >
      © {new Date().getFullYear()} {studioName}
      <span className="mx-[7px] inline-block" aria-hidden>|</span>
      <button onClick={onLegal} className="underline-offset-2 hover:underline" data-cursor="nav" data-cursor-text="Legal & Privacy">
        Legal &amp; Privacy
      </button>
      <span className="mx-[7px] inline-block" aria-hidden>|</span>
      <span style={{ opacity: 0.55 }}>Demo content</span>
    </p>
  );
}

/** Compact cookie notice — always-visible choices, no hover dependency. */
export function CookieBanner({ onLegal }: { onLegal: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("meridian-cookies")) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = (choice: string) => {
    localStorage.setItem("meridian-cookies", choice);
    setVisible(false);
  };

  return (
    <div
      className="fixed z-[58] fade-up"
      style={{
        left: "var(--site-grid-edge)",
        bottom: "var(--site-grid-edge)",
        maxWidth: "min(280px, calc(100vw - var(--site-grid-edge) * 2 - 120px))",
      }}
    >
      <div
        className="flex items-center gap-[12px] rounded-[3px] px-[14px] py-[10px]"
        style={{ background: "rgba(20,20,20,0.88)", backdropFilter: "blur(12px)" }}
      >
        <p className="m-0 text-[11px] leading-[1.4] text-white/75" style={{ letterSpacing: "-0.01em" }}>
          This site uses essential cookies only.
        </p>
        <div className="flex shrink-0 gap-[6px]">
          <button
            onClick={() => dismiss("accepted")}
            className="rounded-[2px] bg-white px-[10px] py-[5px] text-[11px] font-semibold leading-none text-black"
            style={{ letterSpacing: "-0.02em" }}
          >
            Accept
          </button>
          <button
            onClick={() => dismiss("declined")}
            className="rounded-[2px] px-[10px] py-[5px] text-[11px] font-medium leading-none text-white/60"
            style={{ letterSpacing: "-0.02em", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            Decline
          </button>
        </div>
      </div>
      <button
        onClick={onLegal}
        className="mt-[6px] text-[10px] text-white/40 underline-offset-2 hover:text-white/60 hover:underline"
        style={{ letterSpacing: "-0.02em" }}
        data-cursor="nav"
        data-cursor-text="Legal"
      >
        Privacy &amp; Legal
      </button>
    </div>
  );
}
