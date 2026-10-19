import "dotenv/config";
import { db } from "./index";
import {
  aboutContent,
  contactReasons,
  homeContent,
  legalSections,
  projectGallery,
  projects,
  siteSettings,
  teamMembers,
} from "./schema";

/**
 * Seed: dummy content for checking and testing the Meridian theme.
 *
 * Everything below is fictional demo content written for this theme —
 * a make-believe Barcelona practice, "Alba Estudi", used to exercise
 * every page and component the theme renders.
 */
async function seed() {
  console.log("Clearing existing rows…");
  await db.delete(projectGallery);
  await db.delete(projects);
  await db.delete(teamMembers);
  await db.delete(aboutContent);
  await db.delete(homeContent);
  await db.delete(legalSections);
  await db.delete(contactReasons);
  await db.delete(siteSettings);

  console.log("Seeding site settings…");
  await db.insert(siteSettings).values({
    studioName: "Alba Estudi",
    wordmark: "Alba®",
    tagline: "Architecture studio for slow light",
    disciplineLine: "Architecture — Interiors — Objects — Digital media",
    navProjectsLabel: "Projects",
    navAboutLabel: "About",
    navObjectsLabel: "Objects",
    navContactLabel: "Contact",
    navCareersLabel: "Careers",
    contactEmail: "hola@albaestudi.demo",
    contactPhone: "+34 930 000 214",
    addressLine1: "Carrer de la Llum 18, 2n 1a",
    addressLine2: "08003 Barcelona, Catalunya",
    city: "Barcelona",
    country: "ES",
    ctaLabel: "See selected work",
    primaryLanguageLabel: "ENG",
    secondaryLanguageLabel: "ESP",
    clockLabel: "BCN",
    timezone: "Europe/Madrid",
    secondaryClockLabel: "BUE",
    secondaryTimezone: "America/Argentina/Buenos_Aires",
    foundedYear: 2014,
    instagramUrl: "https://instagram.com/",
    linkedinUrl: "https://linkedin.com/",
    careersEmail: "careers@albaestudi.demo",
    careersLead: "We keep the studio small on purpose. When a seat opens, it is because the work genuinely asks for another set of hands, another eye, another calm mind.",
    careersBody: "We review portfolios from architects, interior designers, furniture designers, technologists and image-makers who care about proportion, patience and physical material.\n\nSend a concise PDF under 10 MB and a short note about what kind of work you want to do next. If there is no opening immediately, we keep submissions on file for twelve months and revisit them whenever a project team expands.",
    footerNote: "Independent practice designing buildings, rooms, objects and interactive media since 2014.",
  });

  console.log("Seeding home content…");
  await db.insert(homeContent).values({
    kicker: "Estudi d'arquitectura — Barcelona, founded 2014",
    heroLines: ["Space is a slow", "conversation between", "light and matter."],
    body: "Alba Estudi is a Barcelona practice working across architecture, interiors, objects and digital media. We design rooms, buildings and tools that hold their calm — measured in proportion, finished in honest material, and open to the weather of the people who use them.",
    mosaic: [
      // Hand-composed rail map: start col (1-16), span, aspect and rhythm
      // band (~9 grid-units per step) — dense enough that the drifting
      // viewport never sits empty. Mobile clamps to an 8-column grid.
      { image: "/media/arch-01.jpg", alt: "White coastal house under a clear sky", caption: "Casa Litoral", ratio: "4/5", size: "l", project: "casa-litoral", start: 1, cols: 5, rhythm: 0 },
      { image: "/media/int-01.jpg", alt: "Sunlit chair casting a long shadow", caption: "Fonda Lofts", ratio: "3/4", size: "s", project: "fonda-lofts", start: 8, cols: 3, rhythm: 1 },
      { image: "/media/obj-01.jpg", alt: "Black studio stool on white backdrop", caption: "Meridian Chair", ratio: "3/4", size: "m", project: "meridian-chair", start: 13, cols: 4, rhythm: 0.4 },
      { image: "/media/dig-01.jpg", alt: "Figures inside a field of light", caption: "Pulsar Field", ratio: "16/11", size: "m", project: "pulsar-field", start: 2, cols: 3, rhythm: 3.6 },
      { image: "/media/int-04.jpg", alt: "Sunlight through wooden slats", caption: "Taller 06", ratio: "3/4", size: "m", project: "taller-06", start: 7, cols: 4, rhythm: 3.2 },
      { image: "/media/arch-05.jpg", alt: "Abstract white geometry against the sky", caption: "Barraca Pavilion", ratio: "4/3", size: "s", project: "barraca-pavilion", start: 12, cols: 5, rhythm: 2.8 },
      { image: "/media/stu-01.jpg", alt: "Hands drawing over a landscape model", caption: "Workshop", ratio: "4/3", size: "s", project: "barraca-pavilion", start: 1, cols: 4, rhythm: 6.4 },
      { image: "/media/dig-03.jpg", alt: "Colour projection over a visitor's shadow", caption: "Pulsar Field", ratio: "3/4", size: "s", project: "pulsar-field", start: 6, cols: 3, rhythm: 6.9 },
      { image: "/media/obj-04.jpg", alt: "Black chair beside a white wall", caption: "Meridian Chair", ratio: "4/5", size: "m", project: "meridian-chair", start: 10, cols: 3, rhythm: 6.2 },
      { image: "/media/arch-06.jpg", alt: "Roof geometry in black and white", caption: "Barraca Pavilion", ratio: "4/3", size: "m", project: "barraca-pavilion", start: 14, cols: 3, rhythm: 7.4 },
      { image: "/media/int-02.jpg", alt: "Minimal door half open to the hall", caption: "Fonda Lofts", ratio: "3/4", size: "s", project: "fonda-lofts", start: 3, cols: 3, rhythm: 9.8 },
      { image: "/media/dig-02.jpg", alt: "Figures standing among projected lights", caption: "Pulsar Field", ratio: "3/4", size: "m", project: "pulsar-field", start: 7, cols: 4, rhythm: 9.4 },
      { image: "/media/arch-03.jpg", alt: "White geometric volume against the sky", caption: "Casa Litoral", ratio: "4/3", size: "s", project: "casa-litoral", start: 12, cols: 5, rhythm: 8.9 },
      { image: "/media/stu-03.jpg", alt: "Compass over a working model", caption: "Workshop", ratio: "3/4", size: "s", project: "taller-06", start: 1, cols: 3, rhythm: 12.6 },
      { image: "/media/obj-02.jpg", alt: "Wooden chair against a white wall", caption: "Meridian Chair", ratio: "4/3", size: "m", project: "meridian-chair", start: 5, cols: 5, rhythm: 12.1 },
      { image: "/media/int-06.jpg", alt: "Soft shadow across timber flooring", caption: "Taller 06", ratio: "3/4", size: "s", project: "taller-06", start: 11, cols: 3, rhythm: 12.9 },
    ],
  });

  console.log("Seeding projects…");
  const [litoral, fonda, meridian, pulsar, barraca, taller] = await db
    .insert(projects)
    .values([
      {
        slug: "casa-litoral",
        title: "Casa Litoral",
        subtitle: "A house tuned to the sea wind",
        kind: "project",
        teaser:
          "A single-storey coastal house organised around a shaded court, where every room keeps a diagonal view of the water.",
        location: "Cadaqués, Girona",
        cardImage: "/media/arch-01.jpg",
        cardImageAlt: "White coastal house under a clear sky",
        heroImage: "/media/arch-01.jpg",
        heroImageAlt: "Casa Litoral main facade facing the sea",
        previewImage: "/media/arch-03.jpg",
        yearLabel: "Year",
        yearValue: "2023 — 2025",
        collaborationLabel: "With",
        collaborationValue: "Taller Quart (structure)",
        scopeLabel: "Scope",
        scopeValue: "Full design, site supervision, furniture",
        websiteLabel: "Link",
        websiteValue: null,
        statusLabel: "Status",
        statusValue: "Built",
        description:
          "Casa Litoral sits on a terraced plot that falls towards the Cap de Creus. The plan bends once, a quiet seven degrees, so that the living room faces the dawn and the bedrooms hold the last light.\n\nWalls are built from local stone taken from the excavation itself, left rough outside and limed smooth inside. A long concrete bench runs the full south edge — part seat, part plinth, part balustrade.\n\nThe house asks very little of its machines: cross-ventilation, deep shade and one metre of rock do most of the work.",
        published: true,
        sortOrder: 1,
      },
      {
        slug: "fonda-lofts",
        title: "Fonda Lofts",
        subtitle: "Twelve rooms inside an old boarding house",
        kind: "project",
        teaser:
          "A 1908 boarding house re-cut into twelve long-stay rooms, keeping every original tile the building was willing to give back.",
        location: "El Raval, Barcelona",
        cardImage: "/media/int-01.jpg",
        cardImageAlt: "Sunlit chair casting a long shadow in a quiet room",
        heroImage: "/media/int-01.jpg",
        heroImageAlt: "Fonda Lofts room with afternoon sunlight",
        previewImage: "/media/int-02.jpg",
        yearLabel: "Year",
        yearValue: "2024",
        collaborationLabel: "With",
        collaborationValue: "Fusteria Bau (joinery)",
        scopeLabel: "Scope",
        scopeValue: "Interior refurbisment, 640 m²",
        websiteLabel: "Link",
        websiteValue: "fondalofts.demo",
        statusLabel: "Status",
        statusValue: "Built",
        description:
          "The fonda had been closed for thirty years and the light inside had kept working without an audience. The refurbishment tries to interrupt as little of that as possible.\n\nEach room is one long joinery line — bed, desk, shelf and window seat in a single run of ash — set against the original cement tiles, which were lifted, numbered and relaid room by room.\n\nCorridors were treated as streets: darker, narrower, ending always in a window.",
        published: true,
        sortOrder: 2,
      },
      {
        slug: "meridian-chair",
        title: "Meridian Chair",
        subtitle: "A stool that sits like a sundial",
        kind: "object",
        teaser:
          "Three legs, one cold-rolled ring and a seat that turns through the day — a small study of how furniture measures time.",
        location: "Barcelona",
        cardImage: "/media/obj-01.jpg",
        cardImageAlt: "Black studio stool on a white backdrop",
        heroImage: "/media/obj-01.jpg",
        heroImageAlt: "Meridian Chair prototype three",
        previewImage: "/media/obj-02.jpg",
        yearLabel: "Year",
        yearValue: "2022 — ongoing",
        collaborationLabel: "With",
        collaborationValue: "Dris (metalwork)",
        scopeLabel: "Scope",
        scopeValue: "Object design, small series of 60",
        websiteLabel: "Link",
        websiteValue: null,
        statusLabel: "Status",
        statusValue: "In production",
        description:
          "The Meridian Chair began as a site model for a pavilion and refused to grow up. Its seat is a full circle divided in twenty-four — one notch per hour — so the sitter chooses their own orientation like a hand on a dial.\n\nCold-rolled steel ring, turned ash seat, three legs welded at thirty, sixty and ninety degrees. No screws anywhere; the ring is shrunk on hot and never comes off.\n\nEach piece is stamped with its number and the hour of its final weld.",
        published: true,
        sortOrder: 3,
      },
      {
        slug: "pulsar-field",
        title: "Pulsar Field",
        subtitle: "A room that answers your pulse",
        kind: "project",
        teaser:
          "An interactive light installation that listens to the visitor's heartbeat and breathes back at half its tempo.",
        location: "Disseny Hub, Barcelona",
        cardImage: "/media/dig-01.jpg",
        cardImageAlt: "Silhouettes inside a field of light",
        heroImage: "/media/dig-01.jpg",
        heroImageAlt: "Pulsar Field during the opening test run",
        previewImage: "/media/dig-02.jpg",
        yearLabel: "Year",
        yearValue: "2025",
        collaborationLabel: "With",
        collaborationValue: "Onionlab (engineering)",
        scopeLabel: "Scope",
        scopeValue: "Concept, spatial design, software direction",
        websiteLabel: "Link",
        websiteValue: "pulsarfield.demo",
        statusLabel: "Status",
        statusValue: "Exhibited",
        description:
          "Pulsar Field is a dark room of one hundred and forty-four suspended tubes. A visitor places a hand on a brass plate at the entrance; the installation takes the pulse and, for four minutes, the whole field breathes at exactly half that rate.\n\nThe slowing is the work. Heart rates measured on exit fall by an average of nine beats per minute.\n\nBuilt with Onionlab for the 2025 Llum BCN programme; since toured to two further venues.",
        published: true,
        sortOrder: 4,
      },
      {
        slug: "barraca-pavilion",
        title: "Barraca Pavilion",
        subtitle: "A harvest shelter drawn to one line",
        kind: "project",
        teaser:
          "A seasonal pavilion for a wine cooperative — one folded roof, no enclosed walls, and a shadow that sweeps like a clock hand.",
        location: "Penedès, Barcelona",
        cardImage: "/media/arch-06.jpg",
        cardImageAlt: "Roof geometry in black and white",
        heroImage: "/media/arch-06.jpg",
        heroImageAlt: "Barraca Pavilion roof edge against the vineyards",
        previewImage: "/media/arch-04.jpg",
        yearLabel: "Year",
        yearValue: "2021 — 2022",
        collaborationLabel: "With",
        collaborationValue: "Coop de Llevant (client-build)",
        scopeLabel: "Scope",
        scopeValue: "Design and build, 280 m²",
        websiteLabel: "Link",
        websiteValue: null,
        statusLabel: "Status",
        statusValue: "Built",
        description:
          "The cooperative asked for shade during the harvest and nothing else. The pavilion keeps the brief: one folded plane of corrugated fibre-cement on twelve slender columns, just high enough for a tractor at its lowest edge.\n\nRainwater runs to a single gargoyle and into an old irrigation pond. In August the shadow of the western edge sweeps the tasting table like a slow minute hand.\n\nCost, per square metre of shade: lower than the marquee it replaced.",
        published: true,
        sortOrder: 5,
      },
      {
        slug: "taller-06",
        title: "Taller 06",
        subtitle: "Our own workshop, kept honest",
        kind: "project",
        teaser:
          "The studio's workshop in Poblenou — a timber screen, a long shared table, and storage engineered so the mess has somewhere to go.",
        location: "Poblenou, Barcelona",
        cardImage: "/media/int-04.jpg",
        cardImageAlt: "Sunlight passing through a wooden slat screen",
        heroImage: "/media/int-04.jpg",
        heroImageAlt: "Taller 06 timber screen in morning light",
        previewImage: "/media/int-03.jpg",
        yearLabel: "Year",
        yearValue: "2023",
        collaborationLabel: "With",
        collaborationValue: "Fusteria Bau (joinery)",
        scopeLabel: "Scope",
        scopeValue: "Workplace interior, 190 m²",
        websiteLabel: "Link",
        websiteValue: null,
        statusLabel: "Status",
        statusValue: "Built",
        description:
          "Taller 06 is where the practice makes its models, mocks its details and argues about them. The interior had to survive daily use by people who take photographs of skirtings.\n\nA single intervention organises everything: a floor-to-ceiling timber screen that is at once library, material archive, stair balustrade and projection surface.\n\nThe rest of the budget went into the shared table — eleven metres of solid ash, cut from a single tree.",
        published: true,
        sortOrder: 6,
      },
    ])
    .returning({ id: projects.id, slug: projects.slug });

  const bySlug = Object.fromEntries(
    [litoral, fonda, meridian, pulsar, barraca, taller].map((p) => [p.slug, p.id]),
  );

  console.log("Seeding project galleries…");
  await db.insert(projectGallery).values([
    // Casa Litoral
    { projectId: bySlug["casa-litoral"], image: "/media/arch-02.jpg", alt: "Close view of geometric balconies", caption: "East facade — balcony rhythm", span: "half", sortOrder: 1 },
    { projectId: bySlug["casa-litoral"], image: "/media/arch-03.jpg", alt: "White geometric volume against the sky", caption: "Court wall — lime finish", span: "half", sortOrder: 2 },
    { projectId: bySlug["casa-litoral"], image: "/media/arch-05.jpg", alt: "Abstract white roof geometry", caption: "Roof edge — the seven-degree bend", span: "full", sortOrder: 3 },
    { projectId: bySlug["casa-litoral"], image: "/media/int-05.jpg", alt: "Clay vessels in soft window light", caption: "Kitchen shelf — morning", span: "half", sortOrder: 4 },
    // Fonda Lofts
    { projectId: bySlug["fonda-lofts"], image: "/media/int-02.jpg", alt: "Minimal door half open to the hall", caption: "Corridor — treated as a street", span: "half", sortOrder: 1 },
    { projectId: bySlug["fonda-lofts"], image: "/media/int-03.jpg", alt: "Wooden cabinet lit by a shaft of sun", caption: "Room 7 — joinery line", span: "half", sortOrder: 2 },
    { projectId: bySlug["fonda-lofts"], image: "/media/int-06.jpg", alt: "Curtain shadow crossing a wooden floor", caption: "Original tiles, relaid", span: "full", sortOrder: 3 },
    // Meridian Chair
    { projectId: bySlug["meridian-chair"], image: "/media/obj-02.jpg", caption: "Prototype 01 — raw ash", alt: "Wooden chair against a white wall", span: "half", sortOrder: 1 },
    { projectId: bySlug["meridian-chair"], image: "/media/obj-04.jpg", alt: "Black chair beside a white wall", caption: "Prototype 03 — shrunk ring", span: "half", sortOrder: 2 },
    { projectId: bySlug["meridian-chair"], image: "/media/obj-03.jpg", alt: "Coloured chairs in a minimal setting", caption: "Small series — colour study", span: "full", sortOrder: 3 },
    // Pulsar Field
    { projectId: bySlug["pulsar-field"], image: "/media/dig-02.jpg", alt: "Figures standing among projected lights", caption: "Field density test", span: "half", sortOrder: 1 },
    { projectId: bySlug["pulsar-field"], image: "/media/dig-03.jpg", alt: "Colour projected across a visitor's shadow", caption: "Interaction — brass plate", span: "half", sortOrder: 2 },
    { projectId: bySlug["pulsar-field"], image: "/media/dig-04.jpg", alt: "Visitor lit dramatically inside the installation", caption: "Four-minute cycle", span: "full", sortOrder: 3 },
    // Barraca Pavilion
    { projectId: bySlug["barraca-pavilion"], image: "/media/arch-04.jpg", alt: "Glass and concrete geometry under the sky", caption: "Fold line — single plane", span: "full", sortOrder: 1 },
    { projectId: bySlug["barraca-pavilion"], image: "/media/arch-05.jpg", alt: "White abstract shapes and sky", caption: "Gargoyle — pond return", span: "half", sortOrder: 2 },
    { projectId: bySlug["barraca-pavilion"], image: "/media/stu-01.jpg", alt: "Hands working on the pavilion model", caption: "Site model 1:50", span: "half", sortOrder: 3 },
    // Taller 06
    { projectId: bySlug["taller-06"], image: "/media/stu-03.jpg", alt: "Compass over a working model", caption: "The long table — eleven metres", span: "half", sortOrder: 1 },
    { projectId: bySlug["taller-06"], image: "/media/stu-04.jpg", alt: "Model being assembled by hand", caption: "Archive wall — 1:20 details", span: "half", sortOrder: 2 },
    { projectId: bySlug["taller-06"], image: "/media/int-06.jpg", alt: "Soft shadow play over timber flooring", caption: "Screen detail — projection test", span: "full", sortOrder: 3 },
  ]);

  console.log("Seeding team…");
  await db.insert(teamMembers).values([
    {
      name: "Marta Vidal",
      role: "Founding partner — Architecture",
      bio: "Architect ETSAB. Founded the practice in 2014 after a decade between Barcelona and Porto. Leads housing and landscape work; still draws every first section by hand.",
      photo: "/media/team-01.jpg",
      photoAlt: "Marta Vidal sketching floor plans at her desk",
      linkedinUrl: "https://linkedin.com/",
      instagramUrl: "https://instagram.com/",
      sortOrder: 1,
    },
    {
      name: "Oriol Ferrer",
      role: "Partner — Digital media",
      bio: "Engineer turned installation designer. Runs the interactive side of the studio, from projection tests to the software the buildings quietly depend on.",
      photo: "/media/team-02.jpg",
      photoAlt: "Portrait of Oriol Ferrer in glasses, arms crossed",
      linkedinUrl: "https://linkedin.com/",
      instagramUrl: null,
      sortOrder: 2,
    },
    {
      name: "Laia Bosch",
      role: "Head of Interiors",
      bio: "Joined in 2017. Leads the interiors unit and the studio's material archive — a wall of stone, lime and timber that grows with every project.",
      photo: "/media/team-03.jpg",
      photoAlt: "Laia Bosch holding rolled drawings in the workshop",
      linkedinUrl: "https://linkedin.com/",
      instagramUrl: "https://instagram.com/",
      sortOrder: 3,
    },
    {
      name: "Guillem Roca",
      role: "Technical director",
      bio: "Site architect for twenty-five years. The person who knows why the detail will leak, and how to draw it so it never does.",
      photo: "/media/team-04.jpg",
      photoAlt: "Guillem Roca on site in a hard hat",
      linkedinUrl: null,
      instagramUrl: null,
      sortOrder: 4,
    },
    {
      name: "Nadia Serrà",
      role: "Studio & communications",
      bio: "Keeps the practice legible: texts, exhibitions, publications and the archive. Also the reason the models get photographed before they get dusty.",
      photo: "/media/team-05.jpg",
      photoAlt: "Nadia Serrà reviewing material samples",
      linkedinUrl: "https://linkedin.com/",
      instagramUrl: "https://instagram.com/",
      sortOrder: 5,
    },
  ]);

  console.log("Seeding about page…");
  await db.insert(aboutContent).values({
    kicker: "The practice",
    title: "We design at the speed daylight moves.",
    lede:
      "Alba Estudi is an eleven-person practice in Barcelona. Founded in 2014, the studio works at every scale a person can touch — from a house that faces the dawn to a chair that tells the time.",
    body: "The practice began with one commission and one conviction: that proportion outlasts program. Buildings change use; rooms are re-furnished; objects are inherited. What remains generous is the underlying measure of the thing.\n\nThat is why the studio works at four scales at once. A door handle teaches you about a door; a door about a corridor; a corridor about a district. The thinking moves freely between the sketch, the mock-up and the site model — most decisions in the office are still settled over a piece of physical material.\n\nDigital work entered the practice through exhibitions and stayed. Interactive rooms, responsive light and quiet software now run through many projects, held to the same rule as everything else: it must slow people down, not speed them up.\n\nThe studio takes on four to six commissions a year and declines the rest politely. Every project gets a partner on site, a 1:20 model on the table, and a post-occupancy visit one year after handover.",
    leadImage: "/media/stu-02.jpg",
    leadImageAlt: "The Alba Estudi workshop — miniature furniture models being placed on a desk",
    stats: [
      { label: "Founded", value: "2014" },
      { label: "People", value: "11" },
      { label: "Built works", value: "37" },
      { label: "Countries", value: "6" },
    ],
    services: [
      { title: "Architecture", text: "Housing, cultural and civic buildings, rural structures. Full service from first sketch to the site meeting nobody else wanted to attend." },
      { title: "Interiors", text: "Homes, hotels, workplaces. Joinery-led interiors built around light, storage and the one piece of furniture the client refuses to part with." },
      { title: "Objects", text: "Furniture and hardware in small series. Designed in the workshop, prototyped at 1:1, produced with makers we can call by their first name." },
      { title: "Digital media", text: "Interactive installations, exhibition spaces and the discreet software inside them. Technology dosed slowly, like sunlight." },
    ],
    galleryImages: [
      { image: "/media/stu-01.jpg", alt: "Site model being drawn on", caption: "Site model — Casa Litoral" },
      { image: "/media/stu-03.jpg", alt: "Compass over a model", caption: "1:20 detail review" },
      { image: "/media/stu-04.jpg", alt: "Hands assembling a study model", caption: "Workshop — mock-up wall" },
    ],
    clients: [
      "Ajuntament de Cadaqués",
      "Coop de Llevant",
      "Disseny Hub Barcelona",
      "Fonda Lofts SL",
      "Fundació Miralda",
      "Hotel Mar de Fons",
      "Llibreria Finestra",
      "Museu del Vi",
    ],
  });

  console.log("Seeding legal sections…");
  await db.insert(legalSections).values([
    {
      anchor: "notice",
      heading: "Legal notice",
      body: "Alba Estudi SCCLP (demo content — not a real company). Registered address: Carrer de la Llum 18, 2n 1a, 08003 Barcelona. This page and the whole site you are reading are seeded dummy content used to test the theme; no real services are offered here.\n\nAll architectural, interior, object and digital works shown are fictional case studies written for demonstration.",
      sortOrder: 1,
    },
    {
      anchor: "privacy",
      heading: "Privacy",
      body: "Messages sent through the contact form are stored in the site database so the studio can reply. They are never shared with third parties, sold, or used for anything other than answering you.\n\nYou can ask for your message to be deleted at any time by writing to the studio email. This site sets no tracking cookies of its own.",
      sortOrder: 2,
    },
    {
      anchor: "cookies",
      heading: "Cookies",
      body: "This theme does not use advertising or analytics cookies. The only storage your browser may hold is a preference for motion and the session storage the contact form uses to show its success state.\n\nIf analytics are added later, this page will say so before they load.",
      sortOrder: 3,
    },
    {
      anchor: "credits",
      heading: "Credits",
      body: "Design and build: Meridian theme for the eshobe-cms platform. Typeface: Geist and Geist Mono. Photography: stock imagery stand-ins, replaced per client at launch.\n\nThis is a demonstration instance populated with fictional studio content.",
      sortOrder: 4,
    },
  ]);

  console.log("Seeding contact reasons…");
  await db.insert(contactReasons).values([
    { label: "New commission", sortOrder: 1 },
    { label: "Press & publications", sortOrder: 2 },
    { label: "Careers", sortOrder: 3 },
    { label: "General", sortOrder: 4 },
  ]);

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
