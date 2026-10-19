import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Content model for the "Meridian" theme — a minimal studio-portfolio theme
 * built for the eshobe-cms multi-tenant platform (see THEME.md).
 *
 * When the theme runs attached to eshobe-cms, the same selectors are served
 * by the headless contract (see src/lib/content-source.ts). This local schema
 * exists so the theme can boot, be checked and tested standalone with
 * seeded dummy data.
 */

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  studioName: varchar("studio_name", { length: 120 }).notNull(),
  wordmark: varchar("wordmark", { length: 120 }).notNull(),
  tagline: varchar("tagline", { length: 240 }).notNull(),
  disciplineLine: varchar("discipline_line", { length: 240 }).notNull(),
  navProjectsLabel: varchar("nav_projects_label", { length: 60 }).notNull(),
  navAboutLabel: varchar("nav_about_label", { length: 60 }).notNull(),
  navObjectsLabel: varchar("nav_objects_label", { length: 60 }).notNull(),
  navContactLabel: varchar("nav_contact_label", { length: 60 }).notNull(),
  navCareersLabel: varchar("nav_careers_label", { length: 60 }).notNull(),
  contactEmail: varchar("contact_email", { length: 160 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 60 }).notNull(),
  addressLine1: varchar("address_line_1", { length: 160 }).notNull(),
  addressLine2: varchar("address_line_2", { length: 160 }).notNull(),
  city: varchar("city", { length: 60 }).notNull(),
  country: varchar("country", { length: 60 }).notNull(),
  ctaLabel: varchar("cta_label", { length: 120 }).notNull(),
  primaryLanguageLabel: varchar("primary_language_label", { length: 12 }).notNull(),
  secondaryLanguageLabel: varchar("secondary_language_label", { length: 12 }).notNull(),
  clockLabel: varchar("clock_label", { length: 12 }).notNull(),
  timezone: varchar("timezone", { length: 60 }).notNull(),
  secondaryClockLabel: varchar("secondary_clock_label", { length: 12 }).notNull(),
  secondaryTimezone: varchar("secondary_timezone", { length: 60 }).notNull(),
  foundedYear: integer("founded_year").notNull(),
  instagramUrl: varchar("instagram_url", { length: 240 }),
  linkedinUrl: varchar("linkedin_url", { length: 240 }),
  careersEmail: varchar("careers_email", { length: 160 }).notNull(),
  careersLead: text("careers_lead").notNull(),
  careersBody: text("careers_body").notNull(),
  footerNote: text("footer_note").notNull(),
});

export const homeContent = pgTable("home_content", {
  id: serial("id").primaryKey(),
  kicker: varchar("kicker", { length: 160 }).notNull(),
  /** Large statement lines rendered in the hero, one per line. */
  heroLines: jsonb("hero_lines").$type<string[]>().notNull(),
  body: text("body").notNull(),
  /**
   * Mosaic tiles for the home rail: media plus its placement on the
   * 16-column grid (start column, column span, vertical rhythm slot).
   */
  mosaic: jsonb("mosaic")
    .$type<
      {
        image: string;
        alt: string;
        caption: string;
        ratio: string;
        size: "s" | "m" | "l";
        project: string;
        start: number;
        cols: number;
        rhythm: number;
      }[]
    >()
    .notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  title: varchar("title", { length: 160 }).notNull(),
  subtitle: varchar("subtitle", { length: 240 }).notNull(),
  /** architecture | interiors | objects | digital */
  kind: varchar("kind", { length: 40 }).notNull(),
  teaser: text("teaser").notNull(),
  location: varchar("location", { length: 120 }).notNull(),
  cardImage: varchar("card_image", { length: 240 }).notNull(),
  cardImageAlt: varchar("card_image_alt", { length: 240 }).notNull(),
  heroImage: varchar("hero_image", { length: 240 }).notNull(),
  heroImageAlt: varchar("hero_image_alt", { length: 240 }).notNull(),
  previewImage: varchar("preview_image", { length: 240 }).notNull(),
  yearLabel: varchar("year_label", { length: 60 }).notNull(),
  yearValue: varchar("year_value", { length: 60 }).notNull(),
  collaborationLabel: varchar("collaboration_label", { length: 60 }).notNull(),
  collaborationValue: varchar("collaboration_value", { length: 160 }).notNull(),
  scopeLabel: varchar("scope_label", { length: 60 }).notNull(),
  scopeValue: varchar("scope_value", { length: 240 }).notNull(),
  websiteLabel: varchar("website_label", { length: 60 }).notNull(),
  websiteValue: varchar("website_value", { length: 160 }),
  statusLabel: varchar("status_label", { length: 60 }).notNull(),
  statusValue: varchar("status_value", { length: 80 }).notNull(),
  description: text("description").notNull(),
  published: boolean("published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const projectGallery = pgTable("project_gallery", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  image: varchar("image", { length: 240 }).notNull(),
  alt: varchar("alt", { length: 240 }).notNull(),
  caption: varchar("caption", { length: 240 }).notNull(),
  /** full | half — editorial span inside the gallery grid */
  span: varchar("span", { length: 12 }).notNull().default("half"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  role: varchar("role", { length: 120 }).notNull(),
  bio: text("bio").notNull(),
  photo: varchar("photo", { length: 240 }).notNull(),
  photoAlt: varchar("photo_alt", { length: 240 }).notNull(),
  linkedinUrl: varchar("linkedin_url", { length: 240 }),
  instagramUrl: varchar("instagram_url", { length: 240 }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const aboutContent = pgTable("about_content", {
  id: serial("id").primaryKey(),
  kicker: varchar("kicker", { length: 160 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  lede: text("lede").notNull(),
  body: text("body").notNull(),
  leadImage: varchar("lead_image", { length: 240 }).notNull(),
  leadImageAlt: varchar("lead_image_alt", { length: 240 }).notNull(),
  stats: jsonb("stats").$type<{ label: string; value: string }[]>().notNull(),
  services: jsonb("services").$type<{ title: string; text: string }[]>().notNull(),
  galleryImages: jsonb("gallery_images")
    .$type<{ image: string; alt: string; caption: string }[]>()
    .notNull(),
  clients: jsonb("clients").$type<string[]>().notNull(),
});

export const legalSections = pgTable("legal_sections", {
  id: serial("id").primaryKey(),
  anchor: varchar("anchor", { length: 80 }).notNull(),
  heading: varchar("heading", { length: 160 }).notNull(),
  body: text("body").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const contactReasons = pgTable("contact_reasons", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 80 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  reason: varchar("reason", { length: 80 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type SiteSettings = typeof siteSettings.$inferSelect;
export type HomeContent = typeof homeContent.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectGalleryItem = typeof projectGallery.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type AboutContent = typeof aboutContent.$inferSelect;
export type LegalSection = typeof legalSections.$inferSelect;
export type ContactReason = typeof contactReasons.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
