import type {
  AboutContent,
  ContactReason,
  HomeContent,
  LegalSection,
  Project,
  ProjectGalleryItem,
  SiteSettings,
  TeamMember,
} from "@/db/schema";

export type ProjectView = Project & { gallery: ProjectGalleryItem[] };

/** The serialisable payload the server hands to the client experience. */
export type ExperienceData = {
  settings: SiteSettings;
  home: HomeContent;
  projects: ProjectView[];
  about: AboutContent;
  team: TeamMember[];
  legal: LegalSection[];
  reasons: ContactReason[];
};

export type View =
  | { name: "home" }
  | { name: "index" }
  | { name: "objects" }
  | { name: "case"; slug: string }
  | { name: "about" }
  | { name: "contact" }
  | { name: "careers" }
  | { name: "legal" };

export function viewToPath(view: View): string {
  switch (view.name) {
    case "home":
      return "/";
    case "index":
      return "/projects";
    case "objects":
      return "/objects";
    case "case":
      return `/projects/${view.slug}`;
    case "about":
      return "/about";
    case "contact":
      return "/contact";
    case "careers":
      return "/careers";
    case "legal":
      return "/legal";
  }
}

export function pathToView(pathname: string): View {
  if (pathname === "/projects") return { name: "index" };
  if (pathname === "/objects") return { name: "objects" };
  if (pathname.startsWith("/projects/")) return { name: "case", slug: pathname.split("/")[2] };
  if (pathname === "/about") return { name: "about" };
  if (pathname === "/contact") return { name: "contact" };
  if (pathname === "/careers") return { name: "careers" };
  if (pathname === "/legal") return { name: "legal" };
  return { name: "home" };
}
