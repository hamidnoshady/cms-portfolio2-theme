import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSnapshot, MOSAIC_SLOTS, richSections, type CmsInput } from "../src/lib/cms/map";

const p = (text: string) => ({ type: "paragraph", children: [{ type: "text", text }] });
const h = (text: string) => ({ type: "heading", tag: "h2", children: [{ type: "text", text }] });
const rich = (...children: object[]) => ({ root: { children } });
const media = (url: string, alt: string, caption?: string) => ({ url, alt, caption: caption ? rich(p(caption)) : null });
const shot = (m: object) => ({ type: "block", fields: { blockType: "mediaBlock", media: m } });

const input: CmsInput = {
  site: {
    name: "Alba Estudi",
    branding: { displayName: "Alba Estudi" },
    themeRuntime: { settings: { wordmark: "Alba®", timezone: "Europe/Madrid", secondaryTimezone: "Not/AZone", foundedYear: 2014 } },
  },
  pages: {
    home: {
      hero: { richText: rich(p("Space is a slow"), p("conversation.")) },
      layout: [{ blockType: "content", columns: [{ richText: rich(p("Intro one."), p("Intro two.")) }] }],
    },
    about: {
      title: "We design at the speed daylight moves.",
      hero: { richText: rich(p("Lede.")), media: media("/api/media/file/lead.jpg", "Lead") },
      layout: [
        { blockType: "features", items: [{ title: "Founded", description: "2014" }] },
        { blockType: "features", items: [{ title: "Architecture", description: "Housing." }] },
        { blockType: "team", members: [{ name: "Marta", role: "Partner", bio: "Bio", photo: media("/m.jpg", "Marta") }] },
        { blockType: "logos", logos: [media("/l.svg", "Coop de Llevant")] },
      ],
    },
    legal: { layout: [{ blockType: "content", columns: [{ richText: rich(h("Legal notice"), p("A."), p("B."), h("Privacy"), p("C.")) }] }] },
    contact: { layout: [{ blockType: "contact", email: "hola@x.test", phones: ["+34 1"], address: "Carrer 18\n08003 Barcelona" }] },
  },
  form: { id: "form-1", fields: [{ name: "name" }, { name: "reason", options: [{ label: "New commission" }, { label: "General" }] }] },
  posts: [
    {
      slug: "casa", title: "Casa", categories: [{ slug: "projects" }], meta: { description: "Teaser" }, publishedAt: "2024-05-01T00:00:00Z",
      heroImage: media("/h.jpg", "Hero"), facts: { year: "2023 — 2025", status: "Built" },
      content: rich(p("Lead."), p("More."), shot(media("/g1.jpg", "G1", "Cap 1")), shot(media("/g2.jpg", "G2")), shot(media("/g3.jpg", "G3"))),
    },
    { slug: "chair", title: "Chair", categories: [{ slug: "objects" }], heroImage: media("/c.jpg", "Chair"), content: rich(p("Obj.")) },
    { slug: "blog", title: "Not a project", categories: [{ slug: "news" }], content: rich(p("x")) },
  ],
};

test("projects: kind by category, uncategorised posts dropped, facts defaulted", () => {
  const { projects } = buildSnapshot(input);
  assert.deepEqual(projects.map((x) => [x.slug, x.kind]), [["casa", "project"], ["chair", "object"]]);
  const casa = projects[0];
  assert.equal(casa.yearValue, "2023 — 2025");
  assert.equal(projects[1].yearValue, "—");
  assert.equal(casa.teaser, "Teaser");
  assert.equal(casa.description, "Lead.\n\nMore.");
  assert.deepEqual(casa.gallery.map((g) => [g.span, g.caption]), [["half", "Cap 1"], ["half", "G2"], ["full", "G3"]]);
  assert.equal(casa.previewImage, "/g1.jpg");
});

test("mosaic: derived from project images onto the fixed rail slots", () => {
  const { home } = buildSnapshot(input);
  assert.ok(home.mosaic.length <= MOSAIC_SLOTS.length);
  assert.deepEqual(home.mosaic.slice(0, 2).map((t) => [t.project, t.image]), [["casa", "/h.jpg"], ["chair", "/c.jpg"]]);
  assert.equal(home.mosaic[0].start, MOSAIC_SLOTS[0].start);
  assert.deepEqual(home.heroLines, ["Space is a slow", "conversation."]);
  assert.equal(home.body, "Intro one.\n\nIntro two.");
});

test("about, legal, contact, reasons, settings", () => {
  const s = buildSnapshot(input);
  assert.deepEqual(s.about.stats, [{ label: "Founded", value: "2014" }]);
  assert.equal(s.about.services[0].title, "Architecture");
  assert.deepEqual(s.about.clients, ["Coop de Llevant"]);
  assert.equal(s.team[0].photo, "/m.jpg");
  assert.deepEqual(s.legal.map((l) => [l.anchor, l.heading, l.body]), [["legal-notice", "Legal notice", "A.\n\nB."], ["privacy", "Privacy", "C."]]);
  assert.deepEqual(s.reasons.map((r) => r.label), ["New commission", "General"]);
  assert.equal(s.formId, "form-1");
  assert.equal(s.settings.contactEmail, "hola@x.test");
  assert.equal(s.settings.addressLine1, "Carrer 18");
  assert.equal(s.settings.timezone, "Europe/Madrid");
  assert.equal(s.settings.secondaryTimezone, "UTC"); // invalid IANA name must not reach Intl in the clock
  assert.equal(s.settings.navProjectsLabel, "Projects");
});

test("an empty tenant still yields a renderable snapshot", () => {
  const s = buildSnapshot({ site: { name: "Empty" }, pages: {}, posts: [] });
  assert.equal(s.settings.studioName, "Empty");
  assert.deepEqual(s.home.heroLines, ["Empty"]);
  assert.deepEqual([s.projects, s.home.mosaic, s.legal, s.reasons], [[], [], [], []]);
  assert.deepEqual(richSections(null), []);
});
