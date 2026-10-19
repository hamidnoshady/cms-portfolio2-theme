import { asc, eq } from "drizzle-orm";
import {
  aboutContent,
  contactMessages,
  contactReasons,
  homeContent,
  legalSections,
  projectGallery,
  projects,
  siteSettings,
  teamMembers,
  type AboutContent,
  type ContactReason,
  type HomeContent,
  type LegalSection,
  type Project,
  type ProjectGalleryItem,
  type SiteSettings,
  type TeamMember,
} from "@/db/schema";
import { cmsEnabled, cmsPost } from "@/lib/cms/client";
import { loadSnapshot } from "@/lib/cms/source";

/* ============================================================
   Content source — Meridian theme
   ------------------------------------------------------------
   Attached to eshobe-cms (ESHOBE_CMS_URL + ESHOBE_API_KEY set
   by the platform): every selector reads the tenant snapshot
   built in src/lib/cms/.
   Standalone (no CMS env): content is served from the local
   PostgreSQL database seeded with dummy data (src/db/seed.ts).
   The page components never change — see THEME.md.
   ============================================================ */

export type ProjectWithGallery = Project & { gallery: ProjectGalleryItem[] };

/** Lazy so a CMS-mode container never needs DATABASE_URL. */
async function getDb() {
  return (await import("@/db")).db;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (cmsEnabled()) return (await loadSnapshot()).settings;
  const rows = await (await getDb()).select().from(siteSettings).limit(1);
  if (!rows[0]) throw new Error("site_settings is empty — run the seed");
  return rows[0];
}

export async function getHomeContent(): Promise<HomeContent> {
  if (cmsEnabled()) return (await loadSnapshot()).home;
  const rows = await (await getDb()).select().from(homeContent).limit(1);
  if (!rows[0]) throw new Error("home_content is empty — run the seed");
  return rows[0];
}

export async function listProjects(kind?: string): Promise<Project[]> {
  const rows: Project[] = cmsEnabled()
    ? (await loadSnapshot()).projects
    : await (await getDb()).select().from(projects).where(eq(projects.published, true)).orderBy(asc(projects.sortOrder));
  if (kind && kind !== "all") return rows.filter((p) => p.kind === kind);
  return rows;
}

export async function getProjectBySlug(
  slug: string,
): Promise<ProjectWithGallery | null> {
  if (cmsEnabled()) return (await loadSnapshot()).projects.find((p) => p.slug === slug) ?? null;
  const db = await getDb();
  const rows = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  const project = rows[0];
  if (!project) return null;
  const gallery = await db
    .select()
    .from(projectGallery)
    .where(eq(projectGallery.projectId, project.id))
    .orderBy(asc(projectGallery.sortOrder));
  return { ...project, gallery };
}

export async function getNextProject(currentSortOrder: number): Promise<Project | null> {
  const all = await listProjects();
  const idx = all.findIndex((p) => p.sortOrder === currentSortOrder);
  if (idx === -1) return all[0] ?? null;
  return all[(idx + 1) % all.length] ?? null;
}

export async function countByKind(): Promise<Record<string, number>> {
  const all = await listProjects();
  return all.reduce<Record<string, number>>((acc, p) => {
    acc[p.kind] = (acc[p.kind] ?? 0) + 1;
    return acc;
  }, {});
}

export async function getAboutContent(): Promise<AboutContent> {
  if (cmsEnabled()) return (await loadSnapshot()).about;
  const rows = await (await getDb()).select().from(aboutContent).limit(1);
  if (!rows[0]) throw new Error("about_content is empty — run the seed");
  return rows[0];
}

export async function listTeam(): Promise<TeamMember[]> {
  if (cmsEnabled()) return (await loadSnapshot()).team;
  return (await getDb()).select().from(teamMembers).orderBy(asc(teamMembers.sortOrder));
}

export async function listLegalSections(): Promise<LegalSection[]> {
  if (cmsEnabled()) return (await loadSnapshot()).legal;
  return (await getDb()).select().from(legalSections).orderBy(asc(legalSections.sortOrder));
}

export async function listContactReasons(): Promise<ContactReason[]> {
  if (cmsEnabled()) return (await loadSnapshot()).reasons;
  return (await getDb()).select().from(contactReasons).orderBy(asc(contactReasons.sortOrder));
}

export async function createContactMessage(input: {
  reason: string;
  name: string;
  email: string;
  message: string;
}): Promise<{ id: number }> {
  if (cmsEnabled()) {
    const { formId } = await loadSnapshot();
    if (!formId) throw new Error("contactForm slot is not bound to a form");
    // The form-submissions endpoint derives the tenant from the form, never from the body.
    const res = await cmsPost<{ doc?: { id?: string | number } }>("/api/form-submissions", {
      form: formId,
      submissionData: Object.entries(input).map(([field, value]) => ({ field, value })),
    });
    return { id: displayRef(res.doc?.id) };
  }
  const [row] = await (await getDb())
    .insert(contactMessages)
    .values(input)
    .returning({ id: contactMessages.id });
  return row;
}

/**
 * The contact surface prints a short numeric "Ref 0042". CMS ids are UUIDs, so derive a
 * stable 4-digit code from the id — a display reference, not the record key.
 */
function displayRef(id: string | number | undefined): number {
  if (typeof id === "number") return id;
  let h = 0;
  for (const c of id ?? "") h = (h * 31 + c.charCodeAt(0)) % 9000;
  return h + 1000;
}

export { paragraphs } from "@/lib/text";
