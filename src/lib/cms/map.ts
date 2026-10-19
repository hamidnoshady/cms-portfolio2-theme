import type { ExperienceData } from "@/components/experience/types";

/* ============================================================
   CMS documents → Meridian view model (pure, no I/O)
   ------------------------------------------------------------
   The experience components consume `ExperienceData` and never
   change; this file is the whole mapping. Rules are by block
   *type and position* (never by guessing at text) and are
   documented for editors in docs/CMS-SETUP.md.
   ============================================================ */

type LNode = { type?: string; tag?: string; text?: string; children?: LNode[]; fields?: Record<string, unknown>; value?: unknown };
type Rich = { root?: { children?: LNode[] } } | null | undefined;
export type MediaDoc = { url?: string | null; alt?: string | null; caption?: Rich } | string | null | undefined;
type Block = { blockType?: string; [k: string]: unknown };
export type PageDoc = { title?: string; hero?: { richText?: Rich; media?: MediaDoc }; layout?: Block[] } | null | undefined;
export type FormDoc = { id?: string; fields?: { name?: string; options?: { label?: string }[] }[] } | null | undefined;
export type PostDoc = {
  slug?: string;
  title?: string;
  heroImage?: MediaDoc;
  content?: Rich;
  categories?: ({ slug?: string } | string)[] | null;
  meta?: { description?: string | null } | null;
  publishedAt?: string | null;
  /** Optional extension group; every key is read defensively. */
  facts?: Record<string, unknown> | null;
};
export type SiteDoc = {
  name?: string;
  branding?: { displayName?: string | null } | null;
  themeRuntime?: { settings?: Record<string, unknown> | null } | null;
};
export type CmsInput = {
  site: SiteDoc;
  pages: Partial<Record<"home" | "about" | "careers" | "legal" | "contact", PageDoc>>;
  form?: FormDoc;
  posts: PostDoc[];
};
export type Snapshot = ExperienceData & { formId: string | null };

/* ---------- rich text ---------- */

const textOf = (n: LNode): string =>
  n.type === "linebreak" ? "\n" : (n.text ?? (n.children ?? []).map(textOf).join(""));
const nodes = (rt: Rich) => rt?.root?.children ?? [];

export const richParagraphs = (rt: Rich): string[] =>
  nodes(rt)
    .filter((n) => n.type === "paragraph")
    .map((n) => textOf(n).trim())
    .filter(Boolean);

const slugify = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");

/** A heading starts a section; paragraphs after it are its body. */
export function richSections(rt: Rich): { anchor: string; heading: string; body: string }[] {
  const out: { anchor: string; heading: string; body: string }[] = [];
  let paras: string[] = [];
  const close = () => {
    const last = out[out.length - 1];
    if (last) last.body = paras.join("\n\n");
    paras = [];
  };
  for (const n of nodes(rt)) {
    if (n.type === "heading") {
      close();
      const heading = textOf(n).trim();
      out.push({ heading, anchor: slugify(heading) || `section-${out.length + 1}`, body: "" });
    } else if (n.type === "paragraph") {
      const t = textOf(n).trim();
      if (t) paras.push(t);
    }
  }
  close();
  return out;
}

/** Media referenced from lexical `upload` / `mediaBlock` nodes, in document order. */
function richMedia(rt: Rich): MediaDoc[] {
  const found: MediaDoc[] = [];
  const walk = (n: LNode) => {
    if (n.type === "upload" && n.value) found.push(n.value as MediaDoc);
    if (n.type === "block" && n.fields?.blockType === "mediaBlock" && n.fields.media) found.push(n.fields.media as MediaDoc);
    n.children?.forEach(walk);
  };
  nodes(rt).forEach(walk);
  return found;
}

/* ---------- small helpers ---------- */

const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : d);
/** Unpopulated media (a bare id) has no url — the image is simply absent. */
const img = (m: MediaDoc, fallbackAlt = "") =>
  typeof m === "object" && m && m.url
    ? { src: m.url, alt: str(m.alt, fallbackAlt), caption: richParagraphs(m.caption).join(" ") }
    : null;
const blocks = (page: PageDoc, type: string): Block[] => (page?.layout ?? []).filter((b) => b.blockType === type);
const list = <T = Record<string, unknown>>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const bodyParas = (page: PageDoc): string[] =>
  list<{ richText?: Rich }>(blocks(page, "content")[0]?.columns).flatMap((c) => richParagraphs(c.richText));
const validZone = (tz: string, d: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return d;
  }
};

/** Hand-composed rail placement (16-col grid), carried over from the reference build. */
export const MOSAIC_SLOTS = [
  { ratio: "4/5", size: "l", start: 1, cols: 5, rhythm: 0 },
  { ratio: "3/4", size: "s", start: 8, cols: 3, rhythm: 1 },
  { ratio: "3/4", size: "m", start: 13, cols: 4, rhythm: 0.4 },
  { ratio: "16/11", size: "m", start: 2, cols: 3, rhythm: 3.6 },
  { ratio: "3/4", size: "m", start: 7, cols: 4, rhythm: 3.2 },
  { ratio: "4/3", size: "s", start: 12, cols: 5, rhythm: 2.8 },
  { ratio: "4/3", size: "s", start: 1, cols: 4, rhythm: 6.4 },
  { ratio: "3/4", size: "s", start: 6, cols: 3, rhythm: 6.9 },
  { ratio: "4/5", size: "m", start: 10, cols: 3, rhythm: 6.2 },
  { ratio: "4/3", size: "m", start: 14, cols: 3, rhythm: 7.4 },
  { ratio: "3/4", size: "s", start: 3, cols: 3, rhythm: 9.8 },
  { ratio: "3/4", size: "m", start: 7, cols: 4, rhythm: 9.4 },
  { ratio: "4/3", size: "s", start: 12, cols: 5, rhythm: 8.9 },
  { ratio: "3/4", size: "s", start: 1, cols: 3, rhythm: 12.6 },
  { ratio: "4/3", size: "m", start: 5, cols: 5, rhythm: 12.1 },
  { ratio: "3/4", size: "s", start: 11, cols: 3, rhythm: 12.9 },
] as const;

export const FALLBACK_LABELS = {
  navProjectsLabel: "Projects",
  navAboutLabel: "About",
  navObjectsLabel: "Objects",
  navContactLabel: "Contact",
  navCareersLabel: "Careers",
  ctaLabel: "See selected work",
  primaryLanguageLabel: "ENG",
} as const;

/* ---------- projects ---------- */

function toProjects(posts: PostDoc[], cfg: { projects: string; objects: string }): ExperienceData["projects"] {
  const out: ExperienceData["projects"] = [];
  for (const post of posts) {
    const cats = list<{ slug?: string } | string>(post.categories).map((c) => (typeof c === "object" ? str(c.slug) : ""));
    const kind = cats.includes(cfg.objects) ? "object" : cats.includes(cfg.projects) ? "project" : null;
    if (!kind || !post.slug) continue;

    const title = str(post.title);
    const f = post.facts ?? {};
    const hero = img(post.heroImage, title);
    const shots = richMedia(post.content).map((m) => img(m)).filter((m) => m !== null);
    const heroSrc = hero?.src ?? shots[0]?.src ?? "";
    const paras = richParagraphs(post.content);
    const dash = (v: unknown) => str(v) || "—";
    const id = out.length + 1;

    out.push({
      id,
      slug: post.slug,
      title,
      subtitle: str(f.subtitle),
      kind,
      teaser: str(post.meta?.description) || paras[0] || "",
      location: dash(f.location),
      cardImage: heroSrc,
      cardImageAlt: hero?.alt ?? title,
      heroImage: heroSrc,
      heroImageAlt: hero?.alt ?? title,
      previewImage: shots[0]?.src ?? heroSrc,
      yearLabel: "Year",
      yearValue: str(f.year) || str(post.publishedAt).slice(0, 4) || "—",
      collaborationLabel: "With",
      collaborationValue: dash(f.collaboration),
      scopeLabel: "Scope",
      scopeValue: dash(f.scope),
      websiteLabel: "Link",
      websiteValue: str(f.website) || null,
      statusLabel: "Status",
      statusValue: dash(f.status),
      description: paras.join("\n\n"),
      published: true,
      sortOrder: id,
      gallery: shots.map((s, i) => ({
        id: i + 1,
        projectId: id,
        image: s.src,
        alt: s.alt || title,
        caption: s.caption || s.alt || title,
        span: i % 3 === 2 ? "full" : "half",
        sortOrder: i + 1,
      })),
    });
  }
  return out;
}

/** Tiles come from the projects' own images, round-robin, so editors manage one thing. */
function toMosaic(projects: ExperienceData["projects"]): ExperienceData["home"]["mosaic"] {
  const tiles: ExperienceData["home"]["mosaic"] = [];
  for (let round = 0; tiles.length < MOSAIC_SLOTS.length; round++) {
    const before = tiles.length;
    for (const p of projects) {
      const slot = MOSAIC_SLOTS[tiles.length];
      if (!slot) break;
      const pic = round === 0 ? { image: p.cardImage, alt: p.cardImageAlt } : p.gallery[round - 1] && { image: p.gallery[round - 1].image, alt: p.gallery[round - 1].alt };
      if (pic?.image) tiles.push({ ...slot, image: pic.image, alt: pic.alt, caption: p.title, project: p.slug });
    }
    if (tiles.length === before) break;
  }
  return tiles;
}

/* ---------- snapshot ---------- */

export function buildSnapshot({ site, pages, form, posts }: CmsInput): Snapshot {
  const s = site.themeRuntime?.settings ?? {};
  const studioName = str(site.branding?.displayName) || str(site.name) || "Studio";
  const label = (k: keyof typeof FALLBACK_LABELS) => str(s[k]) || FALLBACK_LABELS[k];

  const contact = blocks(pages.contact, "contact")[0] ?? {};
  const address = str(contact.address).split("\n").map((l) => l.trim()).filter(Boolean);

  const projects = toProjects(posts, {
    projects: str(s.projectsCategorySlug, "projects") || "projects",
    objects: str(s.objectsCategorySlug, "objects") || "objects",
  });

  const home = pages.home;
  const about = pages.about;
  const lead = img(about?.hero?.media, str(about?.title));

  const settings: ExperienceData["settings"] = {
    id: 1,
    studioName,
    wordmark: str(s.wordmark) || studioName,
    tagline: str(s.tagline),
    disciplineLine: str(s.disciplineLine),
    navProjectsLabel: label("navProjectsLabel"),
    navAboutLabel: label("navAboutLabel"),
    navObjectsLabel: label("navObjectsLabel"),
    navContactLabel: label("navContactLabel"),
    navCareersLabel: label("navCareersLabel"),
    contactEmail: str(contact.email),
    contactPhone: str(list(contact.phones)[0]),
    addressLine1: address[0] ?? "",
    addressLine2: address.slice(1).join(", "),
    city: str(s.city),
    country: str(s.country),
    ctaLabel: label("ctaLabel"),
    primaryLanguageLabel: label("primaryLanguageLabel"),
    secondaryLanguageLabel: str(s.secondaryLanguageLabel),
    clockLabel: str(s.clockLabel) || "UTC",
    timezone: validZone(str(s.timezone), "UTC"),
    secondaryClockLabel: str(s.secondaryClockLabel) || "UTC",
    secondaryTimezone: validZone(str(s.secondaryTimezone), "UTC"),
    foundedYear: Number(s.foundedYear) || new Date().getFullYear(),
    instagramUrl: str(s.instagramUrl) || null,
    linkedinUrl: str(s.linkedinUrl) || null,
    careersEmail: str(s.careersEmail),
    careersLead: richParagraphs(pages.careers?.hero?.richText).join(" "),
    careersBody: bodyParas(pages.careers).join("\n\n"),
    footerNote: str(s.footerNote),
  };

  const team = list<{ name?: string; role?: string; bio?: string; photo?: MediaDoc }>(blocks(about, "team")[0]?.members).map((m, i) => {
    const photo = img(m.photo, str(m.name));
    return {
      id: i + 1,
      name: str(m.name),
      role: str(m.role),
      bio: str(m.bio),
      photo: photo?.src ?? "",
      photoAlt: photo?.alt ?? str(m.name),
      linkedinUrl: null,
      instagramUrl: null,
      sortOrder: i + 1,
    };
  });

  const legal = list<{ richText?: Rich }>(blocks(pages.legal, "content").flatMap((b) => list(b.columns)))
    .flatMap((c) => richSections(c.richText))
    .map((sec, i) => ({ id: i + 1, ...sec, sortOrder: i + 1 }));

  const reasons = list<{ name?: string; options?: { label?: string }[] }>(form?.fields)
    .filter((f) => f.name === "reason")
    .flatMap((f) => list<{ label?: string }>(f.options))
    .map((o, i) => ({ id: i + 1, label: str(o.label), sortOrder: i + 1 }))
    .filter((r) => r.label);

  return {
    formId: form?.id ?? null,
    settings,
    projects,
    team,
    legal,
    reasons,
    home: {
      id: 1,
      kicker: str(s.homeKicker),
      heroLines: richParagraphs(home?.hero?.richText).length ? richParagraphs(home?.hero?.richText) : [studioName],
      body: bodyParas(home).join("\n\n"),
      mosaic: toMosaic(projects),
    },
    about: {
      id: 1,
      kicker: str(s.aboutKicker, "The practice"),
      title: str(about?.title),
      lede: richParagraphs(about?.hero?.richText).join(" "),
      body: bodyParas(about).join("\n\n"),
      leadImage: lead?.src ?? "",
      leadImageAlt: lead?.alt ?? "",
      stats: list<{ title?: string; description?: string }>(blocks(about, "features")[0]?.items).map((i) => ({ label: str(i.title), value: str(i.description) })),
      services: list<{ title?: string; description?: string }>(blocks(about, "features")[1]?.items).map((i) => ({ title: str(i.title), text: str(i.description) })),
      galleryImages: list<MediaDoc>(blocks(about, "gallery")[0]?.images)
        .map((m) => img(m))
        .filter((m) => m !== null)
        .map((m) => ({ image: m.src, alt: m.alt, caption: m.caption || m.alt })),
      clients: list<MediaDoc>(blocks(about, "logos")[0]?.logos)
        .map((m) => img(m))
        .map((m) => m?.alt ?? "")
        .filter(Boolean),
    },
  };
}
