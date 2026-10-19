"use client";

import { AboutOverlay } from "@/components/experience/about-overlay";
import { CaseOverlay } from "@/components/experience/case-overlay";
import { CookieBanner, SiteChrome, SiteCopyright } from "@/components/experience/chrome";
import { ContactOverlay } from "@/components/experience/contact-overlay";
import { CornerMeta } from "@/components/experience/corner-meta";
import { ExperienceCursor } from "@/components/experience/cursor";
import { IndexOverlay } from "@/components/experience/index-overlay";
import { LegalOverlay } from "@/components/experience/legal-overlay";
import { IntroLoader } from "@/components/experience/loader";
import { MosaicRail } from "@/components/experience/mosaic";
import {
  pathToView,
  viewToPath,
  type ExperienceData,
  type View,
} from "@/components/experience/types";
import { CenterWordmark } from "@/components/experience/wordmark";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function CareersOverlay({
  title, email, lead, body, onClose,
}: {
  title: string; email: string; lead: string; body: string; onClose: () => void;
}) {
  return (
    <div className="surface-scroll z-[40]" style={{ background: "var(--site-bg)" }}>
      <div className="edge mx-auto max-w-[760px] py-[96px]">
        <button onClick={onClose} className="t-nav mb-[48px] opacity-40 hover:opacity-100" data-cursor="nav" data-cursor-text="Close">
          Close.
        </button>
        <h2 className="m-0 font-medium lowercase" style={{ fontSize: "clamp(54px, 7vw, 104px)", letterSpacing: "-0.08em", lineHeight: 0.92 }}>
          {title.toLowerCase()}
        </h2>
        <p className="mt-[28px] max-w-[540px] text-[18px] font-medium leading-[1.2] tracking-[-0.02em] text-black/80">{lead}</p>
        <div className="mt-[56px] grid gap-[24px] min-[901px]:grid-cols-[1fr_232px]">
          <div className="max-w-[560px] whitespace-pre-line text-[16px] leading-[1.45] tracking-[-0.02em] text-black/72">{body}</div>
          <div className="self-start text-right">
            <p className="m-0 text-[10px] uppercase tracking-[-0.02em] text-black/45">Send</p>
            <a href={`mailto:${email}`} className="mt-[8px] inline-block text-[18px] font-medium tracking-[-0.04em] hover:underline" data-cursor="nav" data-cursor-text={email}>
              {email}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExperienceRoot({
  data,
  initialView,
}: {
  data: ExperienceData;
  initialView: View;
}) {
  const [view, setView] = useState<View>(initialView);
  const [loaded, setLoaded] = useState(false);
  const [dimmed, setDimmed] = useState(false);
  const returnViewRef = useRef<View>(
    initialView.name === "case" ? { name: "home" } : initialView,
  );

  const [mountedProject, setMountedProject] = useState<{
    slug: string;
    isExiting: boolean;
  } | null>(() =>
    initialView.name === "case" ? { slug: initialView.slug, isExiting: false } : null,
  );

  useEffect(() => {
    const onPop = () => setView(pathToView(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  const titleFor = useCallback(
    (v: View): string => {
      const base = data.settings.studioName;
      switch (v.name) {
        case "index":   return `${data.settings.navProjectsLabel} — ${base}`;
        case "objects": return `${data.settings.navObjectsLabel} — ${base}`;
        case "case": {
          const p = data.projects.find(x => x.slug === v.slug);
          return p ? `${p.title} — ${base}` : base;
        }
        case "about":   return `${data.settings.navAboutLabel} — ${base}`;
        case "contact": return `${data.settings.navContactLabel} — ${base}`;
        case "careers": return `${data.settings.navCareersLabel} — ${base}`;
        case "legal":   return `Legal — ${base}`;
        default:        return `${base} — ${data.settings.tagline}`;
      }
    },
    [data.projects, data.settings],
  );

  const nav = useCallback(
    (next: View) => {
      setView(current => {
        if (next.name !== "case") returnViewRef.current = next;
        const nextPath = viewToPath(next);
        const currentPath = viewToPath(current);
        if (nextPath !== currentPath && "pushState" in window.history) {
          window.history.pushState(null, "", nextPath);
          document.title = titleFor(next);
        }
        return next;
      });
    },
    [titleFor],
  );

  const openCase = useCallback(
    (slug: string) => {
      setView(current => {
        if (current.name !== "case") returnViewRef.current = current;
        return current;
      });
      setMountedProject({ slug, isExiting: false });
      nav({ name: "case", slug });
    },
    [nav],
  );

  const initiateClose = useCallback(() => {
    setMountedProject(prev => prev ? { ...prev, isExiting: true } : null);
    nav(returnViewRef.current);
  }, [nav]);

  const onCaseExited = useCallback(() => {
    setMountedProject(null);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (mountedProject && !mountedProject.isExiting) {
        initiateClose();
      } else if (view.name !== "home" && view.name !== "case") {
        nav({ name: "home" });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [mountedProject, view.name, initiateClose, nav]);

  const currentCaseSlug = mountedProject?.slug ?? null;
  const activeProject = useMemo(
    () => (currentCaseSlug ? (data.projects.find(p => p.slug === currentCaseSlug) ?? null) : null),
    [currentCaseSlug, data.projects],
  );
  const nextProject = useMemo(() => {
    if (!activeProject) return null;
    const idx = data.projects.findIndex(p => p.slug === activeProject.slug);
    return data.projects[(idx + 1) % data.projects.length] ?? null;
  }, [activeProject, data.projects]);

  const objectProjects = useMemo(
    () => data.projects.filter(p => p.kind === "object"),
    [data.projects],
  );
  const loaderTile = data.home.mosaic[0];

  const caseIsLive = mountedProject !== null;
  const homeVisible = view.name === "home";
  const mosaicFrozen = !homeVisible;

  const chromeHidden = !loaded || (caseIsLive && !mountedProject?.isExiting);

  return (
    <div className="min-h-dvh bg-[var(--site-bg)]">
      <ExperienceCursor />

      <IntroLoader
        image={loaderTile?.image ?? data.projects[0]?.cardImage ?? ""}
        alt={loaderTile?.alt ?? ""}
        markColor="#000"
        onDone={() => setLoaded(true)}
      />

      <MosaicRail
        tiles={data.home.mosaic}
        onOpen={openCase}
        frozen={mosaicFrozen}
      />

      <CenterWordmark
        pieces={[
          data.settings.studioName.split(" ")[0]?.toLowerCase() ?? "alba",
          data.settings.studioName.split(" ").slice(1).join(" ").toLowerCase() || "estudi",
        ]}
        view={view}
        dimmed={dimmed}
      />

      {view.name === "index" && !caseIsLive ? (
        <IndexOverlay
          projects={data.projects.filter(p => p.kind !== "object")}
          onOpenCase={openCase}
          title={data.settings.navProjectsLabel}
        />
      ) : null}

      {view.name === "objects" && !caseIsLive ? (
        <IndexOverlay
          projects={objectProjects}
          onOpenCase={openCase}
          title={data.settings.navObjectsLabel}
        />
      ) : null}

      {caseIsLive && activeProject ? (
        <CaseOverlay
          key={activeProject.slug}
          project={activeProject}
          next={nextProject}
          reasons={data.reasons.map(r => r.label)}
          onClose={initiateClose}
          onOpenCase={openCase}
          onExited={onCaseExited}
        />
      ) : null}

      {view.name === "about" && !caseIsLive ? <AboutOverlay data={data} onDim={setDimmed} /> : null}

      {view.name === "contact" && !caseIsLive ? (
        <ContactOverlay
          reasons={data.reasons.map(r => r.label)}
          email={data.settings.contactEmail}
          onClose={() => nav({ name: "home" })}
        />
      ) : null}

      {view.name === "careers" && !caseIsLive ? (
        <CareersOverlay
          title={data.settings.navCareersLabel}
          email={data.settings.careersEmail}
          lead={data.settings.careersLead}
          body={data.settings.careersBody}
          onClose={() => nav({ name: "home" })}
        />
      ) : null}

      {view.name === "legal" && !caseIsLive ? (
        <LegalOverlay sections={data.legal} onClose={() => nav({ name: "home" })} />
      ) : null}

      <SiteChrome
        view={view}
        navLabels={[
          { key: "home",    label: "Home",                                        target: { name: "home" }    },
          { key: "about",   label: data.settings.navAboutLabel.toLowerCase(),   target: { name: "about" }   },
          { key: "index",   label: data.settings.navProjectsLabel.toLowerCase(), target: { name: "index" }   },
          { key: "objects", label: data.settings.navObjectsLabel.toLowerCase(),  target: { name: "objects" } },
          { key: "contact", label: data.settings.navContactLabel.toLowerCase(),  target: { name: "contact" } },
          { key: "careers", label: data.settings.navCareersLabel.toLowerCase(),  target: { name: "careers" } },
        ]}
        onNav={nav}
      />

      <CornerMeta
        primaryLanguage={data.settings.primaryLanguageLabel}
        secondaryLanguage={data.settings.secondaryLanguageLabel}
        primaryClockLabel={data.settings.clockLabel}
        primaryTimezone={data.settings.timezone}
        secondaryClockLabel={data.settings.secondaryClockLabel}
        secondaryTimezone={data.settings.secondaryTimezone}
        hidden={chromeHidden}
      />

      <SiteCopyright
        studioName={data.settings.studioName}
        onLegal={() => nav(view.name === "legal" ? { name: "home" } : { name: "legal" })}
        hidden={chromeHidden}
      />

      {!caseIsLive && (
        <CookieBanner onLegal={() => nav(view.name === "legal" ? { name: "home" } : { name: "legal" })} />
      )}
    </div>
  );
}
