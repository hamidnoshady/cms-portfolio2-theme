import { ExperienceRoot } from "@/components/experience/experience-root";
import { getExperienceData } from "@/lib/experience-data";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Objects" };

export default async function ObjectsPage() {
  const data = await getExperienceData();
  return <ExperienceRoot data={data} initialView={{ name: "objects" }} />;
}
