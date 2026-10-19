"use client";

import { BlockMark } from "@/components/experience/chrome";
import { useEffect, useState } from "react";

export function IntroLoader({
  image,
  alt,
  markColor,
  onDone,
}: {
  image: string;
  alt: string;
  markColor: string;
  onDone: () => void;
}) {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<"run" | "exit" | "gone">("run");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("meridian-intro") === "1") {
      setPhase("gone");
      onDone();
      return;
    }
    sessionStorage.setItem("meridian-intro", "1");
    document.documentElement.style.overflow = "hidden";

    const start = performance.now();
    const DURATION = 1250;
    let raf = 0;
    let done = false;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / DURATION);
      const eased = 1 - Math.pow(1 - p, 2.4);
      setCount(Math.round(eased * 100));
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else if (!done) {
        done = true;
        setPhase("exit");
        document.documentElement.style.overflow = "";
        setTimeout(() => {
          setPhase("gone");
          onDone();
        }, 820);
      }
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.overflow = "";
    };
  }, [onDone]);

  if (phase === "gone") return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-white"
      style={{
        transform: phase === "exit" ? "translateY(-100%)" : "translateY(0)",
        transition: "transform .8s cubic-bezier(.65,0,.35,1)",
      }}
      aria-hidden
    >
      <div
        className="relative"
        style={{ width: "min(217px, calc((100vw - 64px) * .448))" }}
      >
        <div className="media-zoom" style={{ aspectRatio: "1" }}>
          <img
            src={image}
            alt={alt}
            style={{
              opacity: count > 4 ? 1 : 0,
              transform: count > 4 ? "scale(1)" : "scale(1.14)",
              transition: "opacity .6s cubic-bezier(.65,0,.35,1), transform 1.1s cubic-bezier(.65,0,.35,1)",
            }}
          />
        </div>
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            color: count > 40 ? "#fff" : markColor,
            transform: "translate(-50%,-50%) scale(1.872)",
            transition: "color .4s ease",
            mixBlendMode: count > 40 ? "difference" : "normal",
          }}
        >
          <BlockMark />
        </div>
      </div>

      <p
        className="t-clock fixed z-[201] m-0 tabular-nums"
        style={{ right: "var(--site-grid-edge)", bottom: 32, color: "#2e2e2e" }}
      >
        {String(count).padStart(3, "0")}
      </p>
    </div>
  );
}
