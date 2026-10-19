import { NotFoundExperience } from "@/components/experience/not-found";
import { getSiteSettings } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function NotFound() {
  const settings = await getSiteSettings();
  const [first, ...rest] = settings.studioName.split(" ");
  return (
    <NotFoundExperience
      pieces={[first ?? "Alba", rest.join(" ") || "Estudi"]}
      routes={[
        { href: "/", label: "Home" },
        { href: "/projects", label: settings.navProjectsLabel },
        { href: "/about", label: settings.navAboutLabel },
        { href: "/contact", label: settings.navContactLabel },
      ]}
    />
  );
}
