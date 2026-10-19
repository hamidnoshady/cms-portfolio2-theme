"use client";

import { useEffect, useRef } from "react";

type CursorMode =
  | { kind: "none" }
  | { kind: "default" }
  | { kind: "nav"; text: string; rect: DOMRect }
  | { kind: "row" }
  | { kind: "label"; text: string };

export function ExperienceCursor() {
  const squareRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const pillTextRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const labelTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("has-custom-cursor");

    const square = squareRef.current!;
    const pill = pillRef.current!;
    const pillText = pillTextRef.current!;
    const label = labelRef.current!;
    const labelText = labelTextRef.current!;

    let mx = -200, my = -200, sx = -200, sy = -200;
    let raf = 0;
    let shown = false;
    let pillX = 0, pillY = 0, pillW = 0, pillH = 0;
    let pillTX = 0, pillTY = 0, pillTW = 0, pillTH = 0;
    let currentMode: CursorMode = { kind: "none" };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    function resolveMode(): CursorMode {
      const el = document.elementFromPoint(mx, my) as HTMLElement | null;
      const hit = el?.closest?.("[data-cursor], a, button") as HTMLElement | null;
      if (!hit) return { kind: shown ? "default" : "none" };
      if (hit.matches("input, textarea, select") || hit.closest("input, textarea, select, [contenteditable='true']")) return { kind: "none" };

      const raw = hit.dataset.cursor ?? "";
      const navText = hit.dataset.cursorText?.trim();
      const labelTextValue = hit.dataset.cursorLabel?.trim();

      if (raw === "nav") {
        const text = navText || hit.textContent?.trim() || "";
        return text ? { kind: "nav", text, rect: hit.getBoundingClientRect() } : { kind: "default" };
      }
      if (raw === "row") return { kind: "row" };
      if (raw === "view") return { kind: "label", text: "View" };
      if (raw === "expand") return { kind: "label", text: "Expand" };
      if (raw === "collapse") return { kind: "label", text: "Collapse" };
      if (raw === "label") return { kind: "label", text: labelTextValue || "" };
      if (hit.tagName === "A" && !hit.querySelector("*")) {
        const text = hit.textContent?.trim() || "";
        return text ? { kind: "nav", text, rect: hit.getBoundingClientRect() } : { kind: "default" };
      }
      return { kind: "default" };
    }

    function applyMode(mode: CursorMode) {
      currentMode = mode;
      if (mode.kind === "none") {
        square.style.opacity = "0"; pill.style.opacity = "0"; label.style.opacity = "0";
        return;
      }
      if (mode.kind === "default" || mode.kind === "row") {
        square.style.opacity = shown ? "1" : "0";
        square.style.width = mode.kind === "row" ? "8px" : "10px";
        square.style.height = mode.kind === "row" ? "8px" : "10px";
        pill.style.opacity = "0"; label.style.opacity = "0";
        return;
      }
      if (mode.kind === "nav") {
        square.style.opacity = "0"; label.style.opacity = "0";
        pillTX = mode.rect.left + mode.rect.width / 2;
        pillTY = mode.rect.top + mode.rect.height / 2;
        pillTW = mode.rect.width + 14;
        pillTH = mode.rect.height + 6;
        pillText.textContent = mode.text;
        pillText.style.opacity = "1";
        return;
      }
      if (mode.kind === "label") {
        square.style.opacity = shown ? "1" : "0";
        square.style.width = "8px"; square.style.height = "8px";
        pill.style.opacity = "0";
        labelText.textContent = mode.text;
        label.style.opacity = mode.text ? "1" : "0";
      }
    }

    function tick() {
      sx = lerp(sx, mx, 0.22);
      sy = lerp(sy, my, 0.22);
      square.style.transform = `translate3d(${sx}px,${sy}px,0) translate(-50%,-50%)`;
      label.style.transform = `translate3d(${sx}px,${sy - 22}px,0) translate(-50%,-100%)`;

      const mode = resolveMode();
      applyMode(mode);

      if (currentMode.kind === "nav") {
        pillX = lerp(pillX, pillTX, 0.22);
        pillY = lerp(pillY, pillTY, 0.22);
        pillW = lerp(pillW, pillTW, 0.22);
        pillH = lerp(pillH, pillTH, 0.22);
        pill.style.transform = `translate3d(${pillX}px,${pillY}px,0) translate(-50%,-50%)`;
        pill.style.width = `${pillW}px`;
        pill.style.height = `${pillH}px`;
        pill.style.opacity = "1";
      } else {
        pill.style.opacity = "0"; pillText.style.opacity = "0";
      }
      raf = requestAnimationFrame(tick);
    }

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; sx = mx; sy = my; square.style.opacity = "1"; }
    };
    const onLeave = () => {
      shown = false;
      square.style.opacity = "0"; pill.style.opacity = "0";
      pillText.style.opacity = "0"; label.style.opacity = "0";
      labelText.textContent = "";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={squareRef} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[401] opacity-0"
        style={{ width: 10, height: 10, background: "#141414", transition: "width .18s var(--easeIO), height .18s var(--easeIO), opacity .25s" }} />
      <div ref={pillRef} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[400] flex items-center justify-center opacity-0"
        style={{ background: "#141414", borderRadius: 2, transition: "opacity .18s var(--easeIO)" }}>
        <span ref={pillTextRef} className="whitespace-nowrap text-white opacity-0"
          style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1, fontFeatureSettings: '"ss01" 1', transition: "opacity .12s" }} />
      </div>
      <div ref={labelRef} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[402] opacity-0" style={{ transition: "opacity .18s" }}>
        <span ref={labelTextRef} className="block max-w-[180px] text-right leading-[1.15]"
          style={{ fontSize: 11, fontWeight: 600, letterSpacing: "-0.02em", color: "#141414" }} />
      </div>
    </>
  );
}
