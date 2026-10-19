# Eshobe Theme API + manifest conformity — evidence

What the platform expects of a deployable theme (`docs/THEME_API.md` §1–§17b and
`src/lib/deploy/manifest.ts` in `hamidnoshady/eshobe-cms`), and where this repository
proves each expectation. `npm run verify` runs most of this on every commit.

## Manifest (§17b, `parseThemeManifest`)

| Requirement | Where enforced |
|---|---|
| `contractVersion = 1` (never newer than the platform) | `eshobe.theme.json`; pinned by `tests/manifest.test.ts` |
| Closed allowlists (`buildPack`, env `source`, site types, slot/setting types) | `scripts/validate-manifest.mjs` restates `parseThemeManifest`'s closed sets; CI gate |
| `key` slug, `name` required, `siteTypes ⊂ business/portfolio/store` | validator + tests |
| `env` keys uppercase, ≤ 50, platform-owned keys never `source: tenant` | validator mirrors the refusal; tests assert every entry is platform-owned |
| `settings` ≤ 50, `^[a-z][A-Za-z0-9]{0,63}$`, select needs options and a contained default | validator + `tests/manifest.test.ts` (defaults/bounds vs `src/lib/theme/settings.ts`, both directions) |
| `contentSlots` ≤ 50, types `page/post/category/form/media` | validator; code-slot parity via `src/lib/theme/sections.ts` |
| `build`: allowed keys only, safe commands/paths, port 1–65535, `healthCheckPath` starts with `/` | validator + tests |
| `deployment.strategy: registry_image`, `registryImageRepository` matches `ghcr.io/owner/image` | validator hard-codes `ghcr.io/hamidnoshady/cms-portfolio2-theme`; `publish-image.yml` compares it to the pushed tag and aborts on mismatch |
| Manifest ≤ 64 KiB, `preview`/`previewUrl` must be https | validator |
| **The real parser runs on this exact file** | `parseThemeManifestText` (imported from eshobe-cms `src/lib/deploy/manifest.ts`) **accepts** `eshobe.theme.json`: `key: portfolio2-mosaic` — last run 2026-10-18, zero errors |

## Site descriptor (§4) and client rules (§3, §14)

| Contract | Where |
|---|---|
| `GET /api/site` before first paint; branding/locales/theme from the descriptor, nothing invented | `src/lib/cms/endpoints.ts`, `pageContext.ts` |
| Tenant via `Authorization: Bearer $ESHOBE_API_KEY`, never a `Host` rewrite or a query param | `src/lib/cms/client.ts`, `tests/security.test.ts`, `tests/proxy-policy.test.ts` |
| Published-only public reads even with a site key (`where[_status][equals]=published`) | `endpoints.ts` (`publishedFilter`), `tests/content.test.ts` |
| `fallbackLocale=false` when enumerating per-locale URLs | sitemap, metadata, language switch |
| Media from `site.media.origin`, tenant origin allowlist on every URL | `CmsImage`, mosaic tiles, `tests/media.test.ts`, `tests/mosaic-component.test.tsx` |
| `themeCss(site.theme)` injected once, design tokens never trusted (hex/weight clamps) | `src/app/layout.tsx` |
| Secrets stay server-only | `server-only` markers, vitest `tests/stubs/server-only.ts` guard |

## Routes and URLs (§2, §11)

- `/posts…` redirects (307) to `/projects…` (`resolve.ts` `alias`, `proxy.ts` proof);
  unknown single segment probes the CMS for a page (real 404, not a soft 200).
- Sitemap is `force-dynamic` and lists only existing, served-language URLs:
  the static routes `/ /projects /about /contact /en*` plus pages and the bound
  `projectsCategory` subtree — verified live (26 URLs on the QA topology).
- Hreflang alternates land only on the served locales; canonical redirects skip preview.

## Renderer endpoints (§17)

| Endpoint | Behaviour | Proof |
|---|---|---|
| `GET /api/health` | process-only `{ ok: true }` — never calls the CMS (the probe must work during an outage) | `scripts/validate-manifest.mjs` blocks a CMS import in the route; smoke `200` |
| `POST /api/revalidate` | signed raw-body HMAC, reloads the tag cache for the named collections | `src/app/api/revalidate/route.ts`, `tests/api.test.ts` |
| preview | `ESHOBE_PREVIEW_SECRET`-gated, uncached, draft reads | `src/lib/cms/preview.ts` + routes |
| `proxiesApi: true` allows registry deployment | `/api/[...path]` relays the CMS-owned paths with a path/method allowlist; theme-owned routes stay local | `tests/proxy-policy.test.ts` |
| forms relay | only the bound `contactForm` id, honeypot `__eshobe_website_check`, `company` is **not** spam, double-submit prevented | `src/app/api/form-submissions/route.ts`, `tests/form.test.tsx` |

## Container manifest build (§17b + `docs/theme-artifacts.md`)

- `Dockerfile` produces a self-contained runnable server (`node server.js`, standalone);
  health probe targets `/api/health`; QA media never ships in a production image.
- CI: `ci.yml` = the gate (manifest → lint → typecheck → tests → build; browser a11y +
  interaction audits against the standalone on :3200/:3300; image build on PRs).
- `publish-image.yml` = publisher on `main`/`v*`: runs the gate first, pushes
  `ghcr.io/hamidnoshady/cms-portfolio2-theme`, verifies the digest GHCR serves, and
  HMAC-signs the exact JSON bytes it POSTs to the CMS artifact endpoint.
- Three GitHub secrets required for registration: `ESHOBE_CMS_URL` (control-plane
  origin), `ESHOBE_THEME_PACKAGE_ID`, `ESHOBE_THEME_ARTIFACT_SECRET`.
