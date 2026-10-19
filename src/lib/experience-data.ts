import {
  getAboutContent,
  getHomeContent,
  getSiteSettings,
  listContactReasons,
  listLegalSections,
  listProjects,
  listTeam,
  getProjectBySlug,
} from "@/lib/content";
import type { ExperienceData } from "@/components/experience/types";

/** Assemble the full serialisable payload for the client experience. */
export async function getExperienceData(): Promise<ExperienceData> {
  const [settings, home, projects, about, team, legal, reasons] = await Promise.all([
    getSiteSettings(),
    getHomeContent(),
    listProjects(),
    getAboutContent(),
    listTeam(),
    listLegalSections(),
    listContactReasons(),
  ]);

  const withGalleries = await Promise.all(
    projects.map(async (p) => {
      const full = await getProjectBySlug(p.slug);
      return full ?? { ...p, gallery: [] };
    }),
  );

  return { settings, home, projects: withGalleries, about, team, legal, reasons };
}
