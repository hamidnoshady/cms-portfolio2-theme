"use client";

import type { ProjectView } from "@/components/experience/types";
import { useCallback, useEffect, useRef, useState } from "react";

export function IndexOverlay({
  projects,
  onOpenCase,
  title,
}: {
  projects: ProjectView[];
  onOpenCase: (slug: string) => void;
  title: string;
}) {
  const [active, setActive] = useState(0);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = projects[active] ?? projects[0];

  const activate = useCallback((i: number) => {
    if (pendingRef.current) clearTimeout(pendingRef.current);
    pendingRef.current = setTimeout(() => setActive(i), 0);
  }, []);

  const handleRowKey = useCallback(
    (e: React.KeyboardEvent, i: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpenCase(projects[i]!.slug);
      }
    },
    [onOpenCase, projects],
  );

  useEffect(() => () => { if (pendingRef.current) clearTimeout(pendingRef.current); }, []);

  return (
    <div className="fixed inset-0 z-[40] bg-[var(--site-bg)]" role="main">
      <div
        className="absolute hidden min-[761px]:flex"
        style={{
          left: "50vw",
          top: "50vh",
          transform: "translate3d(-50%,-50%,0)",
          maxWidth: "calc(100vw - 64px)",
          gap: 32,
          alignItems: "center",
          zIndex: 7,
        }}
      >
        <button
          className="relative shrink-0 overflow-hidden fade-up"
          style={{
            width: 232,
            height: 312,
            background: "#eee",
            border: 0,
            padding: 0,
            cursor: "pointer",
            zIndex: 1,
            animation: "projectIndexDesktopImageIn .92s cubic-bezier(.65,0,.35,1) .15s backwards",
          }}
          onClick={() => current && onOpenCase(current.slug)}
          data-cursor="view"
          aria-label={current ? `Open ${current.title}` : undefined}
        >
          {projects.map((p, i) => (
            <img
              key={p.slug}
              src={p.previewImage}
              alt=""
              aria-hidden
              loading="eager"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                opacity: i === active ? 1 : 0,
                transform: i === active ? "scale(1)" : "scale(1.06)",
                transition:
                  "opacity .45s cubic-bezier(.65,0,.35,1), transform .76s cubic-bezier(.65,0,.35,1)",
                boxShadow: "0 24px 80px rgba(11,12,11,.12)",
              }}
            />
          ))}
        </button>

        <div
          className="flex flex-col items-start"
          style={{ gap: 8, width: "max-content", zIndex: 2, position: "relative" }}
          role="list"
        >
          {projects.map((p, i) => {
            const isActive = i === active;
            const metaItems = [
              p.location,
              p.kind,
              p.collaborationValue,
              p.yearValue.split(" ")[0],
            ].filter(Boolean);

            return (
              <div
                key={p.slug}
                role="listitem"
                className="flex items-center"
                style={{
                  animation: `projectIndexDesktopRowIn calc(.64s + ${i} * 34ms) cubic-bezier(.65,0,.35,1) calc(.26s + ${i} * 58ms) backwards`,
                }}
              >
                <button
                  className="flex items-center text-left"
                  style={{
                    background: "transparent",
                    border: 0,
                    padding: 0,
                    cursor: "pointer",
                    color: "#000",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    opacity: isActive ? 1 : 0.3,
                    transition: "opacity .24s cubic-bezier(.65,0,.35,1)",
                    minHeight: 29,
                  }}
                  onMouseEnter={() => activate(i)}
                  onFocus={() => activate(i)}
                  onClick={() => onOpenCase(p.slug)}
                  onKeyDown={(e) => handleRowKey(e, i)}
                  aria-current={isActive ? "true" : undefined}
                  data-cursor="row"
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 400,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.2,
                      opacity: 0.3,
                      width: 13,
                      marginRight: 8,
                      fontFeatureSettings: '"ss09" 1',
                      display: "inline-block",
                    }}
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      letterSpacing: "-0.05em",
                      lineHeight: 1.2,
                      fontFeatureSettings: '"ss09" 1, "ss01" 1',
                    }}
                  >
                    {p.title}
                  </span>

                  <span
                    className="inline-flex items-center"
                    style={{
                      gap: 16,
                      marginLeft: 16,
                      opacity: isActive ? 1 : 0,
                      pointerEvents: "none",
                      transition: "opacity .18s cubic-bezier(.65,0,.35,1)",
                      alignSelf: "center",
                    }}
                    aria-hidden={!isActive}
                  >
                    {metaItems.map((m, mi) => (
                      <span
                        key={mi}
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: "-0.02em",
                          lineHeight: 1.2,
                          opacity: 0.5,
                          textTransform: mi === metaItems.length - 1 ? "none" : "uppercase",
                          fontFeatureSettings: '"ss09" 1',
                        }}
                      >
                        {m}
                      </span>
                    ))}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="surface-scroll bg-[var(--site-bg)] min-[761px]:hidden">
        <div
          className="mx-auto flex flex-col"
          style={{
            width: 232,
            maxWidth: "calc(100vw - 32px)",
            gap: 22.5,
            padding: "max(40px, calc(50vh - 161px)) 0",
          }}
        >
          {projects.map((p, i) => (
            <button
              key={p.slug}
              onClick={() => onOpenCase(p.slug)}
              className="relative block overflow-hidden"
              style={{
                width: "100%",
                aspectRatio: "144/193.6549",
                background: "#eee",
                border: 0,
                padding: 0,
                cursor: "pointer",
                animation: `fadeUp .62s cubic-bezier(.65,0,.35,1) ${i * 60}ms backwards`,
              }}
              data-cursor="view"
              aria-label={p.title}
            >
              <img
                src={p.cardImage}
                alt={p.cardImageAlt}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <span
                className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center pb-[16px] mix-blend-difference"
                style={{ color: "#fff" }}
              >
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: "-0.05em",
                    lineHeight: 1.2,
                    fontFeatureSettings: '"ss09" 1, "ss01" 1',
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.title}
                </span>
                <span
                  className="mt-0 flex flex-nowrap items-center gap-[8px]"
                  style={{
                    fontSize: 12,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ fontWeight: 500, opacity: 0.5 }}>{p.kind}</span>
                  <span style={{ fontWeight: 500, opacity: 0.5 }}>{p.location}</span>
                  <span style={{ fontWeight: 400 }}>{p.yearValue.split(" ")[0]}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes projectIndexDesktopImageIn {
          from { opacity: 0; transform: scale(1.04); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes projectIndexDesktopRowIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: inherit; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
