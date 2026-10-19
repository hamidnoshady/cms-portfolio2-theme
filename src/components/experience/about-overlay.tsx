"use client";

import type { ExperienceData } from "@/components/experience/types";
import type { AboutContent, TeamMember } from "@/db/schema";
import { paragraphs } from "@/lib/text";
import { useCallback, useEffect, useRef, useState } from "react";

type RailItem =
  | { kind: "image"; image: string; alt: string; caption: string }
  | { kind: "portrait"; memberId: number; image: string; alt: string; name: string; role: string };

function buildRail(about: AboutContent, team: TeamMember[]): RailItem[] {
  const items: RailItem[] = [];
  const images = about.galleryImages;
  const members = [...team];

  items.push({ kind: "image", image: about.leadImage, alt: about.leadImageAlt, caption: about.kicker });

  let imgIdx = 0;
  let memIdx = 0;
  while (imgIdx < images.length || memIdx < members.length) {
    for (let i = 0; i < 2 && imgIdx < images.length; i++, imgIdx++) {
      const img = images[imgIdx];
      items.push({ kind: "image", image: img.image, alt: img.alt, caption: img.caption });
    }
    if (memIdx < members.length) {
      const m = members[memIdx++];
      items.push({ kind: "portrait", memberId: m.id, image: m.photo, alt: m.photoAlt, name: m.name, role: m.role });
    }
  }
  return items;
}

function ExpandGlyph() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-[2]"
      style={{
        right: 24, bottom: 24,
        width: 13.816, height: 13.816,
        background:
          "linear-gradient(135deg,#fff 0 50%,transparent 50%) 0 0 / 6px 6px no-repeat," +
          "linear-gradient(135deg,transparent 0 50%,#fff 50%) 7.8px 7.8px / 6px 6px no-repeat",
      }}
    />
  );
}

export function AboutOverlay({
  data,
  onDim,
}: {
  data: ExperienceData;
  onDim: (dimmed: boolean) => void;
}) {
  const { about, team, settings } = data;
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const expandedMember = team.find((m) => m.id === expandedId) ?? null;
  const railRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const portraitRefs = useRef<Map<number, HTMLElement>>(new Map());

  const rail = buildRail(about, team);

  useEffect(() => {
    onDim(expandedId !== null);
    return () => onDim(false);
  }, [expandedId, onDim]);

  const scrollToMember = useCallback((memberId: number) => {
    const el = portraitRefs.current.get(memberId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const expandMember = useCallback((memberId: number) => {
    setExpandedId(memberId);
  }, []);

  const collapseMember = useCallback(() => {
    setExpandedId(null);
  }, []);

  useEffect(() => {
    if (expandedId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        collapseMember();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expandedId, collapseMember]);

  const introParas = paragraphs(about.lede + "\n\n" + about.body).slice(0, 3);
  const isBlurred = expandedId !== null;

  return (
    <>
      <div
        ref={surfaceRef}
        className="surface-scroll z-[40]"
        style={{
          background: "var(--site-bg)",
          filter: isBlurred ? "blur(10px)" : "none",
          opacity: isBlurred ? 0.42 : 1,
          transition: "filter .52s cubic-bezier(.65,0,.35,1), opacity .52s cubic-bezier(.65,0,.35,1)",
          pointerEvents: isBlurred ? "none" : "auto",
        }}
      >
        <div style={{ height: "38svh", maxHeight: "56svh" }} aria-hidden />
        <div
          className="min-[1101px]:grid"
          style={{
            minHeight: "max(240svh, 100vh)",
            paddingTop: 0,
          }}
        >
          <aside
            className="min-[1101px]:sticky min-[1101px]:self-start"
            style={{
              gridArea: "1 / 1",
              left: "var(--site-grid-edge)",
              width: 320,
              maxWidth: "calc(100vw - var(--site-grid-edge) * 2)",
              paddingLeft: "var(--site-grid-edge)",
              top: 115,
              marginTop: 115,
              zIndex: 6,
            }}
          >
            <p
              className="m-0 uppercase"
              style={{ fontSize: 12, fontWeight: 600, letterSpacing: "-0.02em", opacity: 0.45 }}
            >
              {about.kicker} — {settings.city}, {settings.foundedYear}
            </p>
            {introParas.map((p, i) => (
              <p
                key={i}
                className="m-0"
                style={{
                  fontSize: 14, fontWeight: 500, letterSpacing: "-0.28px",
                  lineHeight: 1.6, color: "#000",
                  marginTop: i === 0 ? 0 : 20,
                  whiteSpace: "pre-line",
                }}
              >
                {p}
              </p>
            ))}

            <div
              className="mt-[24px] mb-[16px] h-px w-full"
              style={{ background: "#00000029" }}
            />

            <div className="flex w-full flex-col gap-[8px]">
              {team.map((m) => (
                <button
                  key={m.id}
                  onClick={() => scrollToMember(m.id)}
                  className="flex w-full items-center justify-between text-left"
                  data-cursor="row"
                  style={{ lineHeight: 1.6, background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                >
                  <span
                    className="overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.28px", color: "#000" }}
                  >
                    {m.name}
                  </span>
                  <span
                    className="ml-[16px] shrink-0 whitespace-nowrap uppercase"
                    style={{ fontSize: 12, fontWeight: 600, letterSpacing: "-0.24px", opacity: 0.6, color: "#000" }}
                  >
                    {m.role.split("—")[0]?.trim() ?? m.role}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div
            ref={railRef}
            className="mx-auto flex w-[320px] max-w-full flex-col"
            style={{
              gridArea: "1 / 1",
              gap: 31,
              marginTop: "56vh",
              paddingBottom: "56vh",
              zIndex: 8,
            }}
          >
            {rail.map((item, i) => {
              if (item.kind === "image") {
                return (
                  <figure key={`img-${i}`} className="m-0 w-full">
                    <span
                      className={`media-zoom block w-full ${i === 0 ? "fade-up" : "view-slide"}`}
                      style={{
                        aspectRatio: i === 0 ? "320/430" : "320/383",
                        animationDelay: i === 0 ? "0ms" : undefined,
                      }}
                    >
                      <img
                        src={item.image}
                        alt={item.alt}
                        loading={i === 0 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    </span>
                    <figcaption
                      className="mt-[10px] m-0 uppercase"
                      style={{ fontSize: 12, fontWeight: 500, letterSpacing: "-0.02em", opacity: 0.45 }}
                    >
                      {item.caption}
                    </figcaption>
                  </figure>
                );
              }

              return (
                <figure
                  key={`portrait-${item.memberId}`}
                  className="m-0 w-full"
                  ref={(el) => {
                    if (el) portraitRefs.current.set(item.memberId, el);
                  }}
                  style={{ scrollMarginTop: 115 }}
                >
                  <button
                    onClick={() => expandMember(item.memberId)}
                    className="relative block w-full overflow-hidden"
                    style={{ aspectRatio: "408/529", background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                    data-cursor="label"
                    data-cursor-label={`Expand ${item.name}`}
                    aria-label={`Expand ${item.name} profile`}
                  >
                    <img
                      src={item.image}
                      alt={item.alt}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                      style={{ filter: "grayscale(1)", transition: "filter .4s ease" }}
                      onMouseEnter={(e) => { (e.target as HTMLImageElement).style.filter = "grayscale(0)"; }}
                      onMouseLeave={(e) => { (e.target as HTMLImageElement).style.filter = "grayscale(1)"; }}
                    />
                    <ExpandGlyph />
                    <span
                      className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end p-[16px]"
                      style={{
                        background: "linear-gradient(transparent, rgba(0,0,0,.35))",
                        height: 80,
                      }}
                    >
                      <span className="text-[12px] font-medium uppercase tracking-[-0.02em] text-white/80">
                        {item.name} — {item.role.split("—")[0]?.trim() ?? item.role}
                      </span>
                    </span>
                  </button>
                </figure>
              );
            })}
          </div>
        </div>
      </div>

      <MemberOverlay member={expandedMember} onClose={collapseMember} />
    </>
  );
}

function MemberOverlay({
  member,
  onClose,
}: {
  member: TeamMember | null;
  onClose: () => void;
}) {
  const [gone, setGone] = useState(true);

  useEffect(() => {
    if (member) {
      setGone(false);
    } else {
      const t = setTimeout(() => setGone(true), 640);
      return () => clearTimeout(t);
    }
  }, [member]);

  if (gone && !member) return null;
  const open = !!member;

  return (
    <div
      className="fixed inset-0 z-[1200] overflow-y-auto overflow-x-hidden overscroll-contain"
      style={{
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity .52s cubic-bezier(.65,0,.35,1)",
        scrollbarWidth: "none",
        cursor: "pointer",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal={open}
      aria-label={member ? `${member.name} profile` : undefined}
    >
      {member && (
        <>
          <div
            aria-hidden
            className="pointer-events-none fixed left-0 z-[1] w-screen overflow-visible mix-blend-difference"
            style={{
              top: "clamp(82px, 10vh, 112px)",
              marginTop: "-0.16em",
              padding: "0.18em 0 0.28em",
            }}
          >
            <div
              className="flex w-max will-change-transform"
              style={{
                marginLeft: "var(--site-grid-edge)",
                animation: "teamMarquee 42s linear infinite",
              }}
            >
              {[0, 1, 2].map((n) => (
                <span
                  key={n}
                  className="block shrink-0 whitespace-nowrap font-bold text-white"
                  style={{
                    fontSize: "12vw",
                    letterSpacing: "-0.08em",
                    lineHeight: 0.72,
                    paddingRight: "0.32em",
                  }}
                >
                  {member.name}
                </span>
              ))}
            </div>
          </div>

          <style>{`
            @keyframes teamMarquee {
              from { transform: translateX(0); }
              to { transform: translateX(-33.3333%); }
            }
          `}</style>

          <div
            className="relative z-[2] mx-auto flex flex-col items-center"
            style={{
              minHeight: "128vh",
              padding: "clamp(138px, 20vh, 214px) var(--site-grid-edge) 9vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="relative block overflow-hidden"
              style={{
                width: "min(43.5vw, 604px)",
                minWidth: "min(100%, 300px)",
                aspectRatio: "408/529",
                background: "transparent", border: 0, padding: 0, cursor: "pointer",
              }}
              data-cursor="collapse"
              aria-label="Collapse profile"
            >
              <img
                src={member.photo}
                alt={member.photoAlt}
                className="h-full w-full object-cover"
                style={{ filter: "grayscale(1)" }}
              />
            </button>

            <div
              className="mt-[16px] flex w-full items-center justify-between"
              style={{
                maxWidth: "min(43.5vw, 604px)",
                minWidth: "min(100%, 300px)",
                lineHeight: 1.6,
                color: "#000",
              }}
            >
              <span
                className="overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em" }}
              >
                {member.name}
              </span>
              <span
                className="ml-[16px] shrink-0 whitespace-nowrap uppercase"
                style={{ fontSize: 12, fontWeight: 500, opacity: 0.6 }}
              >
                {member.role}
              </span>
            </div>

            <div
              className="mt-[28px] flex w-full items-end justify-between mix-blend-difference"
              style={{ maxWidth: "min(43.5vw, 604px)", minWidth: "min(100%, 300px)" }}
            >
              <SocialWord label="LinkedIn" href={member.linkedinUrl} />
              <SocialWord label="Instagram" href={member.instagramUrl} />
            </div>

            <p
              className="m-0 mt-[48px] whitespace-pre-line text-black"
              style={{
                maxWidth: "min(43.5vw, 604px)",
                minWidth: "min(100%, 300px)",
                fontSize: 18, fontWeight: 500,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                textAlign: "justify",
              }}
            >
              {member.bio}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function SocialWord({ label, href }: { label: string; href: string | null }) {
  const style: React.CSSProperties = {
    fontSize: "clamp(32px, 2.35vw, 44px)",
    fontWeight: 700,
    letterSpacing: "-0.06em",
    lineHeight: 0.92,
    color: "#fff",
    fontFeatureSettings: '"ss01" 1, "ss09" 1',
  };
  if (!href) {
    return <span style={{ ...style, opacity: 0.35 }}>{label}</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={style}
      data-cursor="nav"
      data-cursor-text={label}
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </a>
  );
}
