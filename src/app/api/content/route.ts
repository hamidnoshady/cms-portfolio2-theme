import { cmsEnabled } from "@/lib/cms/client";
import {
  getAboutContent,
  getHomeContent,
  getSiteSettings,
  listProjects,
  listTeam,
} from "@/lib/content";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Full content payload for the renderer — the shape the theme's pages
 * consume. Useful for checking the dummy dataset end-to-end and as the
 * fixture contract when wiring the theme to eshobe-cms (see THEME.md).
 */
export async function GET() {
  // Fixture-contract endpoint for the standalone build only.
  if (cmsEnabled()) return new Response(null, { status: 404 });
  const [siteSettings, homeIntro, aboutPage, projects, teamMembers] = await Promise.all([
    getSiteSettings(),
    getHomeContent(),
    getAboutContent(),
    listProjects(),
    listTeam(),
  ]);

  return NextResponse.json({
    content: {
      siteSettings: {
        wordmark: siteSettings.wordmark,
        studioName: siteSettings.studioName,
        navProjectsLabel: siteSettings.navProjectsLabel,
        navAboutLabel: siteSettings.navAboutLabel,
        navObjectsLabel: siteSettings.navObjectsLabel,
        navContactLabel: siteSettings.navContactLabel,
        navCareersLabel: siteSettings.navCareersLabel,
        contactEmail: siteSettings.contactEmail,
        contactPhone: siteSettings.contactPhone,
        ctaLabel: siteSettings.ctaLabel,
        primaryLanguageLabel: siteSettings.primaryLanguageLabel,
        secondaryLanguageLabel: siteSettings.secondaryLanguageLabel,
        clockLabel: siteSettings.clockLabel,
        timezone: siteSettings.timezone,
        secondaryClockLabel: siteSettings.secondaryClockLabel,
        secondaryTimezone: siteSettings.secondaryTimezone,
        careersEmail: siteSettings.careersEmail,
        careersLead: siteSettings.careersLead,
        careersBody: siteSettings.careersBody,
      },
      homeIntro: {
        kicker: homeIntro.kicker,
        heroLines: homeIntro.heroLines,
        body: homeIntro.body,
        featuredImages: homeIntro.mosaic,
      },
      aboutPage: {
        title: aboutPage.title,
        lede: aboutPage.lede,
        body: aboutPage.body,
        leadImage: aboutPage.leadImage,
        stats: aboutPage.stats,
        services: aboutPage.services,
        galleryItems: aboutPage.galleryImages,
        teamMembers: teamMembers.map((m) => ({
          name: m.name,
          role: m.role,
          bio: m.bio,
          photo: m.photo,
          linkedinUrl: m.linkedinUrl,
          instagramUrl: m.instagramUrl,
        })),
      },
      projects: projects.map((p) => ({
        slug: p.slug,
        title: p.title,
        subtitle: p.subtitle,
        kind: p.kind,
        teaser: p.teaser,
        location: p.location,
        cardImage: p.cardImage,
        heroImage: p.heroImage,
        previewImage: p.previewImage,
        published: p.published,
        sortOrder: p.sortOrder,
        details: {
          yearLabel: p.yearLabel,
          yearValue: p.yearValue,
          collaborationLabel: p.collaborationLabel,
          collaborationValue: p.collaborationValue,
          scopeLabel: p.scopeLabel,
          scopeValue: p.scopeValue,
          websiteLabel: p.websiteLabel,
          websiteValue: p.websiteValue,
          statusLabel: p.statusLabel,
          statusValue: p.statusValue,
          description: p.description,
        },
      })),
    },
  });
}
