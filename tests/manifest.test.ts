import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { SECTIONS, POST_SLOTS } from '@/lib/theme/sections'
import { SETTINGS_BOUNDS, SETTINGS_DEFAULTS } from '@/lib/theme/settings'

/**
 * The manifest is a *contract file*: the CMS validates it with `parseThemeManifest`
 * (closed allow lists everywhere, unknown key = rejection) and then executes what it
 * says — it runs the build command, asks the settings as a generated form, opens
 * bindings for the declared slots and pushes the declared image. These tests pin the
 * things that go wrong in a theme repository *and that no type checker can see*:
 *
 * 1. the manifest drifts from the code (a slot nobody reads, a default that disagrees
 *    with the coercer, a build command this repository cannot run), and
 * 2. a key or name accidentally ships a customer's or another theme's identity.
 *
 * The stronger end-to-end check — feeding this exact file to eshobe-cms's own parser —
 * is what `scripts/validate-manifest.mjs` does in CI, and what `docs/QA.md` records.
 */

const raw = readFileSync(new URL('../eshobe.theme.json', import.meta.url), 'utf8')
const manifest = JSON.parse(raw) as Record<string, unknown>

const TOP_LEVEL = new Set([
  'build',
  'capabilities',
  'contentSlots',
  'contractVersion',
  'deployment',
  'design',
  'env',
  'key',
  'locales',
  'name',
  'nameFa',
  'preview',
  'previewUrl',
  'proxiesApi',
  'settings',
  'siteTypes',
])

const BUILD_PACKS = new Set(['dockercompose', 'dockerfile', 'nixpacks', 'static'])
const SITE_TYPES = new Set(['business', 'portfolio', 'store'])
const ENV_SOURCES = new Set(['platform', 'tenant'])
const SLOT_TYPES = new Set(['page', 'post', 'category', 'form', 'media'])
const SETTING_TYPES = new Set(['boolean', 'number', 'select', 'text'])
const SAFE_COMMAND = /^(?:pnpm|npm|yarn|bun|node|npx|next|vite|astro|nuxt|remix|gatsby|serve)(?:\s+[A-Za-z0-9@._:/=,+-]+)*$/
const SCHEMA_KEY = /^[a-z][A-Za-z0-9]{0,63}$/
const COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/* --- what the code actually binds, reads and implements -------------------- */

const SLOTS_READ_BY_CODE = new Set([
  ...Object.values(SECTIONS).map((section) => section.slot),
  ...POST_SLOTS,
  'contactForm',
])

/** Capabilities the repo can prove: a declared capability must have code behind it. */
const CAPABILITIES_IMPL = new Set(['aboutPage', 'caseStudyReveal', 'contactForm', 'preview', 'projects', 'revalidation'])

/** Settings the theme resolves itself (the map settings flow to the contact block). */
const SETTINGS_RESOLVED_HERE = new Set([
  'archiveTiles', 'caseStudyMarquee', 'caseStudyMarqueeSpeed', 'caseStudyReveal', 'homeTiles', 'mosaicPlan',
])
const SETTINGS_MAP = new Set(['mapApiKey', 'mapCenter', 'mapProvider', 'mapZoom'])

const PLATFORM_OWNED = new Set([
  'ESHOBE_ALLOW_HOST_TENANT',
  'ESHOBE_API_KEY',
  'ESHOBE_CMS_URL',
  'ESHOBE_DEFAULT_LOCALE',
  'ESHOBE_LOCALES',
  'ESHOBE_PREVIEW_SECRET',
  'ESHOBE_PUBLIC_ORIGIN',
  'ESHOBE_REVALIDATE_SECRET',
  'ESHOBE_SITE_DOMAIN',
  'ESHOBE_SITE_ID',
])

describe('eshobe.theme.json', () => {
  it('declares only keys the CMS parser knows', () => {
    for (const key of Object.keys(manifest)) expect(TOP_LEVEL.has(key), `unknown key ${key}`).toBe(true)
  })

  it('declares the contract this theme was built against', () => {
    expect(manifest.contractVersion).toBe(1)
  })

  it("uses this theme's own key and a name that cannot be mistaken for a customer", () => {
    expect(String(manifest.key)).toBe('portfolio2-mosaic')
    expect(String(manifest.key)).toMatch(/^[a-z][a-z0-9-]{1,40}$/)
    // A studio identity belongs to the site's branding in the CMS, never to the package.
    expect(raw.toLowerCase()).not.toMatch(/graphite|estudiobang|bang-portfolio|arch-theme-cms|cms-arch2-theme|cms-arch3-theme|cms-portfolio-theme/)
  })

  it('claims only implemented site types, locales and capabilities', () => {
    for (const type of manifest.siteTypes as string[]) expect(SITE_TYPES.has(type)).toBe(true)
    expect(manifest.siteTypes).toEqual(['portfolio'])
    expect(manifest.locales).toEqual(['fa', 'en'])
    expect(manifest.proxiesApi).toBe(true)

    const capabilities = manifest.capabilities as Record<string, boolean>
    for (const [name, value] of Object.entries(capabilities)) {
      expect(CAPABILITIES_IMPL.has(name), `capability ${name} is not implemented`).toBe(true)
      expect(value).toBe(true)
    }
    // Undeclared means "not implemented": a search field exists nowhere in this theme,
    // and the theme must not *claim* one — not even as an explicit `false`.
    expect('search' in capabilities).toBe(false)
  })

  it('describes a build the parser accepts and this repository can actually run', () => {
    const build = manifest.build as Record<string, unknown>
    expect(BUILD_PACKS.has(String(build.buildPack))).toBe(true)
    expect(build.buildPack).toBe('dockerfile')
    expect(build.dockerfileLocation).toBe('Dockerfile')
    expect(build.port).toBe(3000)
    expect(build.healthCheckPath).toBe('/api/health')
    for (const command of ['installCommand', 'buildCommand', 'startCommand']) {
      expect(SAFE_COMMAND.test(String(build[command])), `unsafe ${command}`).toBe(true)
    }
    // The three commands must be exactly the ones this repository runs, and the npm
    // scripts they call must exist.
    const scripts = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts as Record<string, string>
    expect(build.installCommand).toBe('npm ci')
    expect(build.buildCommand).toBe('npm run build')
    expect(build.startCommand).toBe('npm run start:standalone')
    expect(scripts.build).toBeDefined()
    expect(scripts['start:standalone']).toBeDefined()
  })

  it('declares environment variables as platform-owned and runtime-only', () => {
    const env = manifest.env as { key: string; required: boolean; secret: boolean; source: string }[]
    const seen = new Set<string>()
    for (const entry of env) {
      expect(entry.key).toMatch(/^[A-Z][A-Z0-9_]{0,63}$/)
      expect(seen.has(entry.key)).toBe(false)
      seen.add(entry.key)
      expect(ENV_SOURCES.has(entry.source)).toBe(true)
      // Nothing the theme can be tricked into supplying a value for.
      expect(PLATFORM_OWNED.has(entry.key)).toBe(true)
      expect(entry.source).toBe('platform')
    }
    expect(env.filter((entry) => entry.secret).map((entry) => entry.key).sort()).toEqual(
      ['ESHOBE_API_KEY', 'ESHOBE_PREVIEW_SECRET', 'ESHOBE_REVALIDATE_SECRET'].sort(),
    )
  })

  it('keeps design tokens inside the white/black, square-corner system', () => {
    const design = manifest.design as Record<string, string | number>
    for (const value of Object.values(design)) {
      if (typeof value === 'string' && value.startsWith('#')) expect(COLOR.test(value)).toBe(true)
    }
    expect(design.radius).toBe('none')
    expect(Number(design.lineHeight)).toBeGreaterThanOrEqual(1.4)
    expect(Number(design.lineHeight)).toBeLessThanOrEqual(2.4)
    expect(design.background).toBe('#ffffff')
    expect(design.foreground).toBe('#000000')
  })

  it('declares every slot the code reads, and reads every slot it declares', () => {
    const keys = new Set<string>()
    for (const slot of manifest.contentSlots as { key: string; required: boolean; type: string }[]) {
      expect(SCHEMA_KEY.test(slot.key)).toBe(true)
      expect(SLOT_TYPES.has(slot.type)).toBe(true)
      expect(keys.has(slot.key), `${slot.key} declared twice`).toBe(false)
      keys.add(slot.key)
      expect(SLOTS_READ_BY_CODE.has(slot.key), `${slot.key} is declared but the code cannot resolve it`).toBe(true)
    }
    expect([...SLOTS_READ_BY_CODE].sort()).toEqual([...keys].sort())
  })

  it('declares settings that agree with the coercer, both ways', () => {
    const settings = manifest.settings as Record<string, {
      default?: boolean | number | string
      max?: number
      min?: number
      options?: { value: string }[]
      type: string
    }>
    const declaredKeys = Object.keys(settings)
    for (const key of declaredKeys) {
      expect(SCHEMA_KEY.test(key)).toBe(true)
      const setting = settings[key]!
      expect(SETTING_TYPES.has(setting.type)).toBe(true)
      const consumed = SETTINGS_RESOLVED_HERE.has(key) || SETTINGS_MAP.has(key)
      expect(consumed, `${key} is declared but never consumed`).toBe(true)
    }
    // Every resolved key must be declared, and every declared resolved key must have the
    // same default and the same bounds in both places — otherwise the platform shows one
    // setting while the theme enforces another.
    for (const key of Object.keys(SETTINGS_DEFAULTS) as (keyof typeof SETTINGS_DEFAULTS)[]) {
      const declared = settings[key]
      expect(declared, `${key} is resolved but undeclared`).toBeDefined()
      expect(declared!.default).toBe(SETTINGS_DEFAULTS[key])
      const bounds = (SETTINGS_BOUNDS as Record<string, { max: number; min: number }>)[key]
      if (bounds) {
        expect(declared!.min).toBe(bounds.min)
        expect(declared!.max).toBe(bounds.max)
      }
      if (typeof SETTINGS_DEFAULTS[key] === 'string' && settingHasOptions(settings[key]!)) {
        const options = declared!.options!.map((option) => option.value)
        expect(options).toContain(SETTINGS_DEFAULTS[key])
      }
    }
    // The manual select default must sit inside its option set.
    for (const [key, setting] of Object.entries(settings)) {
      if (setting.type === 'select' && setting.default !== undefined) {
        const options = setting.options?.map((option) => option.value) ?? []
        expect(options, `settings.${key}.default outside its options`).toContain(setting.default)
      }
    }
  })

  it('declares the immutable GHCR image that CI builds and registers, and no preview URL', () => {
    expect(manifest.deployment).toEqual({
      registryImageRepository: 'ghcr.io/hamidnoshady/cms-portfolio2-theme',
      registryProvider: 'ghcr',
      registryVisibility: 'public',
      strategy: 'registry_image',
    })
    expect(manifest.preview ?? manifest.previewUrl ?? null).toBeNull()
  })
})

const settingHasOptions = (setting: { options?: { value: string }[] }): boolean => Array.isArray(setting.options)
