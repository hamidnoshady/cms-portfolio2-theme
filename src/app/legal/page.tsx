import { ExperienceRoot } from "@/components/experience/experience-root";
import { getExperienceData } from "@/lib/experience-data";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legal",
};

export default async function LegalPage() {
  const data = await getExperienceData();
  return <ExperienceRoot data={data} initialView={{ name: "legal" }} />;
}
