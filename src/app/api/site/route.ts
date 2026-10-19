import { cmsEnabled } from "@/lib/cms/client";
import { proxyGet } from "@/lib/cms/proxy";
import { getSiteSettings, listProjects } from "@/lib/content";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Bootstrap payload, shaped after the eshobe-cms headless contract
 * (WAVE-9, GET /api/site): one call a renderer makes before first paint.
 * When this theme is attached to a live eshobe-cms deployment the same
 * shape is served by the control plane; kept here so the contract can be
 * exercised against the local dummy dataset.
 */
export async function GET(request: Request) {
  // Attached to the CMS, /api/site is CMS-owned (proxiesApi) — serve the real descriptor.
  if (cmsEnabled()) return proxyGet(request, ["site"]);
  const [settings, projects] = await Promise.all([getSiteSettings(), listProjects()]);
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";

  const payload = {
    contractVersion: 1,
    domain: host,
    name: settings.studioName,
    slug: "demo-studio",
    type: "portfolio",
    theme: {
      id: "meridian",
      tokens: {
        bg: "#f5f5f2",
        ink: "#141414",
        muted: "rgba(20, 20, 20, 0.3)",
        line: "rgba(20, 20, 20, 0.08)",
        accent: "#946ec4",
        fontSans: "Geist",
        fontMono: "Geist Mono",
      },
    },
    availableLocales: ["en"],
    defaultLocale: "en",
    nav: {
      projects: settings.navProjectsLabel,
      about: settings.navAboutLabel,
      objects: settings.navObjectsLabel,
      contact: settings.navContactLabel,
      careers: settings.navCareersLabel,
    },
    languages: [settings.primaryLanguageLabel, settings.secondaryLanguageLabel],
    clocks: [
      { label: settings.clockLabel, timezone: settings.timezone },
      { label: settings.secondaryClockLabel, timezone: settings.secondaryTimezone },
    ],
    media: { origin: `${proto}://${host}`, basePath: "/media" },
    routes: [
      "/",
      "/projects",
      "/objects",
      ...projects.map((p) => `/projects/${p.slug}`),
      "/about",
      "/contact",
      "/careers",
      "/legal",
    ],
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=30",
      Vary: "Host",
    },
  });
}
