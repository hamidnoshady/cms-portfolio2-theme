# Attaching Meridian to eshobe-cms

Meridian runs in one of two modes, chosen by the environment:

| Mode | When | Content comes from |
| --- | --- | --- |
| **CMS** | `ESHOBE_CMS_URL` **and** `ESHOBE_API_KEY` are set (the platform injects them) | The tenant's eshobe-cms site, via `src/lib/cms/` |
| **Standalone** | Neither is set | Local PostgreSQL seeded with the Alba Estudi dummy data (`src/db/seed.ts`) |

The experience components are identical in both modes — only `src/lib/content.ts` switches source.

## Platform variables

Injected at deploy time, server-side only, never committed or baked into the image
(see `.env.example`): `ESHOBE_CMS_URL`, `ESHOBE_API_KEY` (its id *is* the tenant),
`ESHOBE_SITE_ID`, `ESHOBE_SITE_DOMAIN`, `ESHOBE_PUBLIC_ORIGIN`, `ESHOBE_REVALIDATE_SECRET`.

## Theme-owned routes

| Route | Behaviour |
| --- | --- |
| `GET /api/health` | `{ ok: true }`; in standalone mode it also checks the database |
| `POST /api/revalidate` | Verifies `sha256=<HMAC>` over the **raw body** with `ESHOBE_REVALIDATE_SECRET` (the timestamp header is not signed in v1), then purges this theme's one CMS cache tag. No secret → `503`, bad signature → `401`, body > 64 KB → `413`, another site's id → ignored |
| `POST /api/contact` | Validates, then posts to the CMS `form-submissions` of the bound `contactForm` |
| `GET /api/site`, `GET /api/media/file/*` | Proxied to the CMS (`proxiesApi: true`). Only these two: the site key can read drafts, so content collections are never exposed through the proxy |

## What an editor fills in

Everything is read from stock eshobe-cms collections plus the manifest's settings and
content slots. Rules go by **block type and position**, never by guessing at text.
Nothing is hardcoded: an empty tenant still renders (studio name from the site, empty sections).

### Site → Theme settings («تنظیمات پوسته»)

Studio-level strings: `wordmark`, `tagline`, `disciplineLine`, `homeKicker`, `aboutKicker`, the five
`nav*Label`s, `ctaLabel`, language tags, the two clocks (`clockLabel`/`timezone`,
`secondaryClockLabel`/`secondaryTimezone` — IANA names; an invalid one falls back to `UTC`),
`city`, `country`, `foundedYear`, `instagramUrl`, `linkedinUrl`, `careersEmail`, `footerNote`,
and the category slugs `projectsCategorySlug` / `objectsCategorySlug`.
The studio name is the site's display name (branding), falling back to the site name.

### Content slots (bind each to a document; unbound slots fall back to a page whose slug equals the key)

| Slot | Type | Used for |
| --- | --- | --- |
| `home` | page | `hero.richText` paragraphs → the big statement lines · first `content` block → intro text |
| `about` | page | title · `hero.richText` → lede · `hero.media` → lead image · first `content` block → body · 1st `features` block → stats (title = label, description = value) · 2nd `features` → services · 1st `gallery` → workshop images (media caption → caption) · `team` block → people · `logos` block → client names (each logo's alt text) |
| `careers` | page | `hero.richText` → lead · first `content` block → body (email comes from the `careersEmail` setting) |
| `legal` | page | In the `content` blocks, every **heading** starts a section (its anchor is the slugified heading) and the paragraphs after it are the body |
| `contact` | page | Its `contact` block: `email`, first of `phones`, `address` (first line, then the rest) |
| `contactForm` | form | A `select` field named `reason` (its options are the reason chips) plus `name`, `email`, `message` fields |

### Projects and objects = posts

A published post in the category `projects` becomes a project; in `objects`, an object. Posts in other
categories are ignored.

- Hero image → card/hero image · `meta.description` → teaser · body paragraphs → description ·
  `mediaBlock`s / uploads inside the body → gallery (media caption → caption; every third image spans full width).
- The home mosaic is built from the projects' own images, round-robin, onto the theme's fixed
  rail positions — there is nothing separate to maintain.
- Optional `facts` group on `posts` (not part of stock eshobe-cms; read defensively, rows show "—"
  when absent): `subtitle`, `year` (falls back to the publish year), `location`, `collaboration`,
  `scope`, `website`, `status`.

## Platform integration

1. Push the repo; the CMS syncs [`eshobe.theme.json`](../eshobe.theme.json) (key `meridian`, `portfolio` sites, English only).
2. Create the Theme Binding and publish a **preview**; check `/api/health`.
3. Fill the theme settings and bind the content slots above, then promote to production after a preview pass.

Container contract: [`Dockerfile`](../Dockerfile), `output: 'standalone'`, port `3000`, health `GET /api/health`.

## Known gaps

- **Not run against a live eshobe-cms tenant.** Verified with `pnpm test` (the mapping), `pnpm build`, and a local mock CMS
  (every endpoint above, auth header present, no visitor cookie forwarded, signature accept/reject).
  Real `where`/`depth` behaviour, bound-document shapes and media variants still need a preview pass.
- `posts.facts` does not exist in stock eshobe-cms; until it does, project detail rows other than year show "—".
- Stock imagery is not committed (`public/media/` is absent), so standalone mode shows broken images until it is supplied.
- `pnpm lint` reports pre-existing findings inside `src/components/experience/*` (UI left untouched on purpose); `pnpm verify` therefore omits it.
