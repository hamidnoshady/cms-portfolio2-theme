import { ExperienceRoot } from "@/components/experience/experience-root";
import { getExperienceData } from "@/lib/experience-data";
import { getProjectBySlug } from "@/lib/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Not found" };
  return { title: project.title, description: project.teaser };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const data = await getExperienceData();
  return <ExperienceRoot data={data} initialView={{ name: "case", slug }} />;
}
