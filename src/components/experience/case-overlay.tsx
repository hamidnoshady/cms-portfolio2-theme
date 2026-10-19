"use client";

import type { ProjectView } from "@/components/experience/types";
import { paragraphs } from "@/lib/text";
import { Check } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

const T_ENTER = 820;
const T_CLOSE = 680;

type Phase = "entering" | "open" | "closing";

const RHYTHM: { ratio: string; basis: "full" | "half" | "portrait" }[] = [
  { ratio: "846/448",  basis: "full"     },
  { ratio: "408/529",  basis: "half"     },
  { ratio: "438/297",  basis: "half"     },
  { ratio: "558/712",  basis: "portrait" },
  { ratio: "438/297",  basis: "half"     },
  { ratio: "408/529",  basis: "half"     },
  { ratio: "846/448",  basis: "full"     },
  { ratio: "558/712",  basis: "portrait" },
  { ratio: "408/529",  basis: "half"     },
  { ratio: "438/297",  basis: "half"     },
];

const EASE_OUT = "cubic-bezier(.16,1,.3,1)";
const EASE_IO  = "cubic-bezier(.65,0,.35,1)";

const fieldStyle: CSSProperties = {
  width: 232, minHeight: 29, fontSize: 18, fontWeight: 600,
  letterSpacing: "-0.04em", lineHeight: "13px", padding: "8px",
  textAlign: "center", border: 0, borderRadius: 0, outline: "none",
  fontFeatureSettings: '"ss01" 1', background: "transparent", color: "#000",
  transition: "background-color .18s ease",
};

function ExpandMark() {
  return (
    <span aria-hidden className="pointer-events-none absolute z-[2]" style={{
      right: 24, bottom: 24, width: 13.816, height: 13.816,
      background:
        "linear-gradient(135deg,#fff 0 50%,transparent 50%) 0 0/6px 6px no-repeat," +
        "linear-gradient(135deg,transparent 0 50%,#fff 50%) 7.8px 7.8px/6px 6px no-repeat",
    }} />
  );
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <button className="fixed inset-0 z-[500] flex items-center justify-center border-0 p-0" style={{ background: "rgba(0,0,0,.88)" }} onClick={onClose} data-cursor="collapse" aria-label="Close image">
      <img src={src} alt="" className="fade-up" style={{ maxWidth: "calc(100vw - 64px)", maxHeight: "calc(100svh - 64px)", objectFit: "contain" }} onClick={e => e.stopPropagation()} />
    </button>
  );
}

function CaseContact({ reasons, projectTitle }: { reasons: string[]; projectTitle: string }) {
  const [reason, setReason] = useState(reasons[0] ?? "General");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle"|"sending"|"sent"|"error">("idle");
  const [touched, setTouched] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setTouched(true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setPhase("error"); setTimeout(() => setPhase("idle"), 1900); return;
    }
    setPhase("sending");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, name: email.split("@")[0] ?? "Visitor", email: email.trim(), message: `Enquiry from ${projectTitle}.` }) });
      setPhase(res.ok ? "sent" : "error");
      if (!res.ok) setTimeout(() => setPhase("idle"), 1900);
    } catch { setPhase("error"); setTimeout(() => setPhase("idle"), 1900); }
  }

  if (phase === "sent") return (
    <div className="mx-auto mt-[104px] flex min-h-[126px] w-full flex-col items-center justify-center gap-[8px] text-center">
      <p className="m-0 text-[23.589px] font-bold uppercase" style={{ letterSpacing: "-0.04em" }}>Sent.</p>
      <p className="m-0 max-w-[383px] text-[14px] font-medium text-black/40">Expect a reply within two working days.</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="mx-auto mt-[104px] flex min-h-[126px] w-full flex-col items-center gap-[16px]" noValidate>
      <p className="m-0 max-w-[383px] text-center text-[14px] font-medium tracking-[-0.02em] text-black/30">Tell us where this work should live next.</p>
      <div className="relative">
        <button type="button" onClick={() => setOpen(v => !v)} style={fieldStyle} className="relative flex items-center justify-center hover:bg-[#1414140d]">
          {reason}
          <span aria-hidden className="absolute" style={{ right:17,top:10,width:6,height:6,borderBottom:"2px solid currentColor",borderRight:"2px solid currentColor",transform:open?"rotate(225deg) translate(-2px,-2px)":"rotate(45deg)",transition:"transform .26s" }} />
        </button>
        <div className="absolute left-0 z-[5] overflow-hidden bg-white" style={{ top:29,width:232,maxHeight:open?reasons.length*29:0,transition:"max-height .32s cubic-bezier(.65,0,.35,1)",boxShadow:open?"var(--shadow)":"none" }}>
          {reasons.map(r => <button key={r} type="button" onClick={() => { setReason(r); setOpen(false); }} style={{...fieldStyle,height:29,opacity:r===reason?1:.55}} className="block hover:bg-[#1414140d]">{r}</button>)}
        </div>
      </div>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => setTouched(true)} placeholder="Email"
        style={{...fieldStyle,height:29,background:touched&&email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())?"#c7161d14":"transparent"}}
        className="placeholder:text-[#00000042] hover:bg-[#1414140d] focus:bg-[#1414140d]" autoComplete="email" />
      <button type="submit" disabled={phase==="sending"} style={{...fieldStyle,height:29,background:phase==="error"?"#c7161d":"#141414",color:"#fff"}} data-cursor="nav" data-cursor-text="Send">
        {phase==="sending"?"Sending…":phase==="error"?"Valid email, please":"Send"}
      </button>
    </form>
  );
}

export function CaseOverlay({
  project, next, reasons, onClose, onOpenCase, onExited,
}: {
  project: ProjectView;
  next: ProjectView | null;
  reasons: string[];
  onClose: () => void;
  onOpenCase: (slug: string) => void;
  onExited: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("entering");
  const [copied, setCopied] = useState(false);
  const [lightbox, setLightbox] = useState<string|null>(null);
  const titleRef  = useRef<HTMLDivElement>(null);
  const cardRef   = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const reduced   = useRef(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (reduced.current) { setPhase("open"); return; }
    const id = requestAnimationFrame(() => {
      timerRef.current = setTimeout(() => setPhase("open"), T_ENTER);
    });
    return () => { cancelAnimationFrame(id); if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !lightbox && phase === "open") triggerClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [lightbox, phase]);

  const triggerClose = useCallback(() => {
    if (phase !== "open") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const duration = reduced.current ? 200 : T_CLOSE;

    if (cardRef.current && scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      const rect = scrollRef.current.getBoundingClientRect();
      cardRef.current.style.top = `${rect.top - scrollTop}px`;
    }

    setPhase("closing");
    timerRef.current = setTimeout(() => { onClose(); onExited(); }, duration + 60);
  }, [phase, onClose, onExited]);

  const share = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ url }); }
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    } catch { }
  }, []);

  function titleStyle(): React.CSSProperties {
    const base: React.CSSProperties = {
      position: phase === "closing" ? "fixed" : "absolute",
      top: 0, left: 0, right: 0, zIndex: 72,
      pointerEvents: "none",
      overflow: "hidden",
      height: "clamp(120px,22vw,270px)",
      willChange: "transform",
    };
    if (reduced.current) {
      return { ...base, opacity: phase === "open" ? 1 : 0, transition: "opacity .2s ease" };
    }
    if (phase === "entering") {
      return { ...base, transform: "translateY(-125%)", transition: "none" };
    }
    if (phase === "open") {
      return { ...base, transform: "translateY(0)", transition: `transform ${T_ENTER}ms ${EASE_OUT}` };
    }
    return { ...base, transform: "translateY(-125%)", transition: `transform ${T_CLOSE}ms ${EASE_IO}` };
  }

  function cardWrapStyle(): React.CSSProperties {
    const base: React.CSSProperties = { position: phase === "closing" ? "fixed" : "relative", inset: 0, zIndex: 70 };
    return base;
  }

  function surfaceStyle(): React.CSSProperties {
    if (reduced.current) {
      return {
        position: "fixed", inset: 0, zIndex: 70,
        opacity: phase === "open" ? 1 : 0,
        transition: "opacity .2s ease",
        overflowY: "auto", overscrollBehavior: "contain",
        background: "var(--site-bg)",
        pointerEvents: phase === "open" ? "auto" : "none",
      };
    }
    const base: React.CSSProperties = {
      position: "fixed", inset: 0, zIndex: 70,
      overflowY: phase === "open" ? "auto" : "hidden",
      overscrollBehavior: "contain",
      background: "var(--site-bg)",
      willChange: "transform",
    };
    if (phase === "entering") {
      return { ...base, transform: "translateY(105vh)", transition: "none" };
    }
    if (phase === "open") {
      return { ...base, transform: "translateY(0)", transition: `transform ${T_ENTER}ms ${EASE_OUT}` };
    }
    return {
      ...base,
      transform: "translateY(105vh)",
      transition: `transform ${T_CLOSE}ms ${EASE_IO}`,
      pointerEvents: "none",
    };
  }

  const details: { label: string; value: string; href?: string }[] = [
    { label: project.yearLabel,          value: project.yearValue },
    { label: "Location",                 value: project.location },
    { label: project.collaborationLabel, value: project.collaborationValue },
    { label: project.scopeLabel,         value: project.scopeValue },
    ...(project.websiteValue ? [{ label: project.websiteLabel, value: project.websiteValue, href: `https://${project.websiteValue}` }] : []),
    { label: project.statusLabel,        value: project.statusValue },
  ];

  const introParagraphs = paragraphs(project.description);
  const lead = introParagraphs[0] ?? project.teaser;
  const rest = introParagraphs.slice(1);

  const mediaItems = useMemo(() => [
    { image: project.heroImage,  alt: project.heroImageAlt,  caption: `${project.title} — ${project.location}` },
    ...project.gallery.map(g => ({ image: g.image, alt: g.alt, caption: g.caption })),
  ], [project]);

  const entries: Array<{ kind: "media"|"text"; index: number }> = [];
  mediaItems.forEach((_, i) => {
    entries.push({ kind: "media", index: i });
    if (rest[i]) entries.push({ kind: "text", index: i });
  });

  const hugeTitle = project.title.toLowerCase();

  const marqueeAnimation = reduced.current || phase === "entering"
    ? "none"
    : "caseTitleRamp 2.8s cubic-bezier(.5,0,.5,.5) 0s 1 forwards, caseTitleLinear 48s linear 2.8s infinite";

  return (
    <>
      <style>{`
        @keyframes caseTitleRamp {
          from { transform: translateX(0); }
          to   { transform: translateX(calc(-33.3333% - .46em)); }
        }
        @keyframes caseTitleLinear {
          from { transform: translateX(calc(-33.3333% - .46em)); }
          to   { transform: translateX(calc(-66.6666% - .46em)); }
        }
      `}</style>

      <div ref={titleRef} aria-hidden style={titleStyle()}>
        <div
          className="flex w-max will-change-transform"
          style={{
            marginLeft: "var(--site-grid-edge)",
            paddingTop: 28,
            animation: marqueeAnimation,
          }}
        >
          {[0, 1, 2].map(n => (
            <span
              key={n}
              className="block shrink-0 whitespace-nowrap font-bold lowercase"
              style={{
                fontSize: "clamp(96px,20.9vw,301px)",
                letterSpacing: "-0.08em",
                lineHeight: 0.72,
                paddingRight: ".32em",
                color: "#141414",
              }}
            >
              {hugeTitle}
            </span>
          ))}
        </div>
      </div>

      <div ref={cardRef} style={cardWrapStyle()}>
        <div ref={scrollRef} style={surfaceStyle()}>

          <div style={{ height: "clamp(120px,22vw,270px)" }} aria-hidden />

          <div className="sticky z-[74] ml-auto flex w-max items-center gap-[16px]"
            style={{ top: 31, marginRight: "var(--site-grid-edge)", marginBottom: 52 }}>
            <button onClick={share} className="block uppercase"
              style={{ fontSize:23.589,fontWeight:700,letterSpacing:"-0.04em",lineHeight:1,opacity:copied?1:.6,border:0,background:"none",color:"#141414",cursor:"pointer",padding:0 }}
              data-cursor="nav" data-cursor-text={copied?"Copied":"Share"}>
              {copied ? <span className="inline-flex items-center gap-[8px]">Copied <Check size={16} strokeWidth={3}/></span> : "Share"}
            </button>
            <button onClick={triggerClose} className="block uppercase"
              style={{ fontSize:23.589,fontWeight:700,letterSpacing:"-0.04em",lineHeight:1,border:0,background:"none",color:"#141414",cursor:"pointer",padding:0 }}
              data-cursor="nav" data-cursor-text="Close">
              Close
            </button>
          </div>

          <h1 className="sr-only">{project.title}</h1>

          <div className="mx-auto flex w-full flex-col gap-[24px] min-[761px]:flex-row min-[761px]:gap-[32px]"
            style={{ maxWidth: "min(854px, calc(100% - var(--site-grid-edge) * 2))", paddingInline: "var(--site-grid-edge)" }}>
            <dl className="m-0 shrink-0 overflow-hidden font-medium text-black min-[761px]:w-[230px] min-[761px]:flex-[0_0_230px]"
              style={{ lineHeight: 1.2 }}>
              {details.map(row => (
                <div key={row.label} className="flex items-center justify-between gap-[18px] py-[4px]" style={{ borderBottom: ".5px solid rgba(0,0,0,.1)" }}>
                  <dt className="m-0 shrink-0 font-mono uppercase" style={{ fontSize:10,fontWeight:500,letterSpacing:"-0.02em",color:"#000",opacity:.5 }}>{row.label}</dt>
                  <dd className="m-0 min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-right" style={{ fontSize:12,fontWeight:500,letterSpacing:"-0.02em",color:"#000" }}>
                    {row.href
                      ? <a href={row.href} target="_blank" rel="noreferrer" className="no-underline" data-cursor="nav" data-cursor-text={row.value}>{row.value}</a>
                      : row.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="m-0 min-w-0 flex-1 whitespace-pre-line text-black"
              style={{ fontSize:18,fontWeight:500,letterSpacing:"-0.02em",lineHeight:1.2,textAlign:"justify" }}>
              {project.subtitle}. {lead}
            </p>
          </div>

          <div className="mx-auto mt-[80px] flex w-full flex-col gap-[32px] min-[761px]:mt-[136px]"
            style={{ maxWidth: "min(846px, calc(100% - var(--site-grid-edge) * 2))", paddingInline: "var(--site-grid-edge)" }}>
            {entries.map(entry => {
              if (entry.kind === "text") return (
                <div key={`t-${entry.index}`} className="flex min-h-[74px] w-full items-center justify-end">
                  <p className="m-0 max-w-[383px] whitespace-pre-line text-black"
                    style={{ fontSize:18,fontWeight:500,letterSpacing:"-0.02em",lineHeight:1.2,textAlign:"justify" }}>
                    {rest[entry.index]}
                  </p>
                </div>
              );

              const item = mediaItems[entry.index]!;
              const slot = RHYTHM[entry.index % RHYTHM.length]!;
              return (
                <figure key={`m-${entry.index}`} className="m-0">
                  <button onClick={() => setLightbox(item.image)}
                    className="view-slide relative block overflow-hidden"
                    style={{
                      aspectRatio: slot.ratio,
                      width: slot.basis === "portrait" ? "min(558px,100%)" : "100%",
                      background:"transparent", border:0, padding:0, cursor:"pointer",
                      marginLeft: slot.basis === "portrait" && entry.index % 8 === 7 ? "auto" : 0,
                    }}
                    data-cursor="expand" aria-label={`Expand: ${item.caption}`}>
                    <img src={item.image} alt={item.alt} loading={entry.index===0?"eager":"lazy"} decoding="async" className="block h-full w-full object-cover" />
                    <ExpandMark />
                  </button>
                  <figcaption className="mt-[10px] flex w-full items-center justify-between text-[12px] font-medium uppercase tracking-[-0.02em] text-black/45">
                    <span>{item.caption}</span>
                    <span className="tabular-nums">{String(entry.index+1).padStart(2,"0")}/{String(mediaItems.length).padStart(2,"0")}</span>
                  </figcaption>
                </figure>
              );
            })}

            <CaseContact reasons={reasons} projectTitle={project.title} />

            {next && (
              <button onClick={() => onOpenCase(next.slug)}
                className="mt-[24px] flex w-full items-center justify-between border-t pt-[24px] text-left"
                style={{ borderColor:"rgba(0,0,0,.1)", background:"transparent", borderRight:0, borderLeft:0, borderBottom:0, cursor:"pointer", padding:0, color:"#141414" }} data-cursor="nav" data-cursor-text="Next">
                <span>
                  <span className="block text-[12px] font-medium uppercase tracking-[-0.02em] text-black/45">Next</span>
                  <span className="mt-[6px] block text-[24px] font-bold tracking-[-0.05em]">{next.title}</span>
                </span>
                <span className="text-[12px] font-medium uppercase tracking-[-0.02em] text-black/45">
                  {next.kind} · {next.location} · <span className="normal-case text-black">{next.yearValue.split(" ")[0]}</span>
                </span>
              </button>
            )}
            <div style={{ height: 48 }} />
          </div>

        </div>
      </div>

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}
