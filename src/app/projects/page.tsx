import { ExperienceRoot } from "@/components/experience/experience-root";
import { getExperienceData } from "@/lib/experience-data";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsPage() {
  const data = await getExperienceData();
  return <ExperienceRoot data={data} initialView={{ name: "index" }} />;
}
