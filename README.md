# Mosaic Portfolio — Eshobe CMS portfolio theme

The second portfolio theme for Eshobe CMS (`eshobe.theme.json` key `portfolio2-mosaic`,
Theme API **contractVersion 1**): a CMS-managed index of work as a hairline mosaic, and a
case study that opens over it with a slow, coordinated reveal.

- Every work is a *link* (`/projects/<slug>`) rendered from CMS `posts` under the bound
  `projectsCategory`. Opening it adds a panel *over the same page* (Next's intercepted
  route), so the mosaic, its scroll position and the history entry survive; a refresh or
  a direct URL renders the same case study as an indexable document.
- The reveal: armed → fonts resolve → title measured → title arrives from above while the
  content rises from below → the drift of an *overflowing* title starts only after the
  stage settles. A title that fits never moves. Reduced-motion readers get the resting
  frame, not a shortened animation.
- Share and Close are the only sticky controls, pinned inside the panel scroller. "Next
  project" follows the mosaic order, not `relatedPosts`.
- CMS owns content/media/forms/tenants/publishing/branding; the theme owns
  routes/rendering/motion/a11y/SEO/relay/preview/health. Server-side tenant isolation,
  published-only public reads (`_status=published` even with a site key), proxy
  path/method allowlist, signed raw-body revalidation, and a process-only `/api/health`
  that answers during a CMS outage.

## Target languages

Persian (`fa`, default, RTL) and English (`en`, LTR prefix `/en`) — the locales the
platform registers.

## Routes

`/`, `/projects`, `/projects/[slug]`, `/about`, `/contact`, and any CMS page at
`/<slug>`, with `/en/...` mirrors. One route builder (`src/lib/routing/paths.ts`) serves
navigation, the mosaic, the case study, related work, the language switch, metadata,
sitemap and redirects. The CMS-reserved `/posts/*` aliases (307) to `/projects/*`.

## Content slots (`eshobe.theme.json`)

`home`, `about`, `contact` (pages); `projectsCategory` (category); `leadWork` (post —
pinned to the first mosaic row; silently ignored when draft/missing); `contactForm`
(form). Bindings resolve through `GET /api/site` → `themeRuntime.bindings`.

## Runtime settings

`homeTiles`, `mosaicPlan` (`editorial | duo | uniform`), `archiveTiles`,
`caseStudyReveal`, `caseStudyMarquee`, `caseStudyMarqueeSpeed`, and the contact-map
quartet (`mapProvider`, `mapApiKey`, `mapCenter`, `mapZoom`). Every value is coerced and
clamped in `src/lib/theme/settings.ts`; the manifest declares the same defaults and
bounds, and `tests/manifest.test.ts` fails if the two drift apart.

## Develop

```bash
npm ci
npm run dev                        # with a CMS on ESHOBE_CMS_URL (see scripts/mock-cms.mjs)
ESHOBE_DEV_FIXTURES=1 npm run dev  # offline fixtures
npm run verify                     # manifest + typecheck + lint + tests + build
npm run mock:cms                   # the fixture CMS as an HTTP service (QA/CI)
bash scripts/qa-servers.sh         # the full QA topology (scenario ports)
npm run a11y && npm run audit      # browser audits against :3200, slow pair on :3300
```

## Verification

`npm run verify` passes: manifest validation, typecheck, eslint, 290 tests across 26
files, and the production build. The manifest was additionally fed to eshobe-cms's own
`parseThemeManifest` (the function the sync button runs) and accepted — see
`docs/ESHOBE-CONTRACT.md` for the full §17/§17b checklist. The route set, mosaic, case
study, form relay, health probe and sitemap were smoke-tested against the standalone
build as described in `docs/ESHOBE-CONTRACT.md`; the CI `audits` job re-proves the same
behaviours in Chrome on every pull request.

## CI / deployment

- `.github/workflows/ci.yml` — the single test gate (manifest, lint, typecheck, tests,
  build; browser a11y + interaction audits; Dockerfile build on PRs).
- `.github/workflows/publish-image.yml` — on `main` and `v*` tags: runs CI, builds and
  pushes the image to **ghcr.io/hamidnoshady/cms-portfolio2-theme**, verifies the pushed
  digest and registers the artifact with Eshobe CMS. Needs three repository secrets:
  `ESHOBE_CMS_URL`, `ESHOBE_THEME_PACKAGE_ID`, `ESHOBE_THEME_ARTIFACT_SECRET`
  (`docs/theme-artifacts.md` in eshobe-cms).
- The theme deploys by digest (`deployment.strategy: registry_image`), never by a mutable
  tag, and every platform env variable is injected at runtime — nothing tenant-specific
  is baked into the image.
