import { ExperienceRoot } from "@/components/experience/experience-root";
import { getExperienceData } from "@/lib/experience-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getExperienceData();
  return <ExperienceRoot data={data} initialView={{ name: "home" }} />;
}
