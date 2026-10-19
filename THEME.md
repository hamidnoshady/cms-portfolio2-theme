# Meridian — studio-portfolio theme for eshobe-cms

Meridian is a minimal, editorial portfolio theme for architecture and design
studios, built to run as a tenant theme on the
[eshobe-cms](https://github.com/hamidnoshady/eshobe-cms) multi-tenant
platform (Payload 3 + Next.js, headless contract per `WAVE-9.md`).

This repository is the **standalone reference build**: it ships with its own
PostgreSQL schema (Drizzle) seeded with fictional dummy content ("Alba
Estudi") so every page and component can be checked and tested without a CMS.

> All seeded content — studio name, biographies, project descriptions, legal
> text — is fictional demonstration copy written for this theme. Imagery is
> licensed stock from Pexels, bundled in `public/media/`. Replace both with
> real tenant content in production.

## Page map

| Route | Content |
| --- | --- |
| `/` | Hero statement, editorial image mosaic, selected case cards, discipline index, manifesto |
| `/projects` | Numbered index with cursor-following hover previews, discipline filters (`?kind=`) |
| `/projects/[slug]` | Full-bleed hero, details table (year/location/collaboration/scope/link/status), description, editorial gallery, next-project footer |
| `/about` | Scroll-sharpening manifesto title, stats, services, team grid, workshop gallery, clients |
| `/contact` | Contact blocks + working form (reason chips, validation) persisted to the DB |
| `/legal` | Anchored legal sections with sticky index |
| `404` | Oversized type + route list |

System chrome: fixed header with live tenant clock, full-screen mobile menu,
custom cursor (square/trailing ring, `View` affordance on cards), grain
overlay, one-shot intro veil, giant outline wordmark footer.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Platform healthcheck |
| `GET /api/site` | Renderer bootstrap payload, shaped after the eshobe-cms headless contract (domain, theme tokens, locales, media origin, route table) |
| `GET /api/content` | Full content payload consumed by the pages — the fixture contract for CMS wiring |
| `POST /api/contact` | Contact form intake; validates and stores into `contact_messages` |

## Content model (Drizzle, `src/db/schema.ts`)

`site_settings` (singleton) · `home_content` (singleton, hero lines + mosaic
tiles) · `projects` · `project_gallery` · `team_members` · `about_content`
(singleton, stats/services/gallery/clients) · `legal_sections` ·
`contact_reasons` · `contact_messages`.

Every render path goes through selectors in `src/lib/content.ts` — pages
never touch the DB directly.

## Local development & dummy data

```bash
npx drizzle-kit push --force   # create tables
npx tsx src/db/seed.ts         # load the Alba Estudi dummy dataset
npm run dev
```

Reseed at any time by rerunning the seed (it clears and reloads).

## Attaching to eshobe-cms

Done: the theme is a deployable eshobe theme (`eshobe.theme.json`, `Dockerfile`,
`/api/health`, `/api/revalidate`, CMS-backed selectors). When the platform injects
`ESHOBE_CMS_URL` + `ESHOBE_API_KEY`, `src/lib/content.ts` reads the tenant from the CMS;
without them it serves the local seeded database. The page components are untouched.

See [`docs/CMS-SETUP.md`](docs/CMS-SETUP.md) for the content contract (what editors fill in),
the routes, and what has and has not been verified.

## Stack

Next.js (App Router, RSC) · Drizzle ORM + PostgreSQL · Tailwind CSS 4 ·
Geist + Geist Mono · Lucide icons.
