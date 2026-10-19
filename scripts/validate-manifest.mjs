import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * The repository's own gate on `eshobe.theme.json`.
 *
 * The authoritative validator is `parseThemeManifest` in eshobe-cms
 * (`src/lib/deploy/manifest.ts`), which runs when an operator clicks «همگام‌سازی از
 * گیت‌هاب». A manifest this file accepts and the CMS refuses is a broken deploy at the
 * worst possible moment, so the closed sets, key patterns and bounds below are restated
 * from that parser on purpose — and the last block pins the manifest to what the theme's
 * own code actually binds, reads and promises (slots, settings, the health probe).
 *
 * Run from CI (`npm run validate:manifest`) and before any release tag.
 */

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const MANIFEST = join(root, 'eshobe.theme.json')
const IMAGE = 'ghcr.io/hamidnoshady/cms-portfolio2-theme'

const errors = []
const fail = (message) => errors.push(message)

let manifest
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
} catch (error) {
  console.error(`eshobe.theme.json: ${error instanceof Error ? error.message : 'is not valid JSON'}`)
  process.exit(1)
}

if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
  console.error('eshobe.theme.json: must be a JSON object')
  process.exit(1)
}

const read = (relative) => readFileSync(join(root, relative), 'utf8')

/* --- top-level identity ---------------------------------------------------- */
if (typeof manifest.name !== 'string' || !manifest.name.trim()) fail('name is required')
if (typeof manifest.key !== 'string' || !/^[a-z][a-z0-9-]{0,59}$/.test(manifest.key)) {
  fail('key must be a lowercase slug (letters, digits, hyphens)')
}
if (!Number.isInteger(manifest.contractVersion) || manifest.contractVersion < 1) {
  fail('contractVersion must be an integer >= 1 (the CMS refuses a higher one than it implements)')
}
if (manifest.contractVersion !== 1) fail('contractVersion must be 1 for this platform release')

const SITE_TYPES = ['business', 'portfolio', 'store']
if (!Array.isArray(manifest.siteTypes) || manifest.siteTypes.length === 0) {
  fail('siteTypes must be a non-empty array')
} else {
  for (const value of manifest.siteTypes) {
    if (!SITE_TYPES.includes(value)) fail(`siteTypes: unknown site type "${value}"`)
  }
}

if (!Array.isArray(manifest.locales) || manifest.locales.length === 0) {
  fail('locales must be a non-empty array (the CMS registers fa and en)')
} else {
  for (const locale of manifest.locales) {
    if (locale !== 'fa' && locale !== 'en') fail(`locales: "${locale}" is not served by the platform`)
  }
  if (manifest.locales[0] !== 'fa') fail('locales must start with fa (the platform is Persian-first)')
}

if (manifest.proxiesApi !== true) {
  fail('proxiesApi must be true: the theme relays CMS-owned /api/* paths (see src/app/api/[...path])')
}

/* --- design tokens --------------------------------------------------------- */
const DESIGN_COLORS = ['accent', 'background', 'foreground', 'primary']
const DESIGN_RADIUS = ['none', 'sm', 'md', 'lg']
const design = manifest.design ?? {}
for (const key of Object.keys(design)) {
  if (!DESIGN_COLORS.includes(key) && key !== 'radius' && key !== 'lineHeight') {
    fail(`design.${key} is not a supported token`)
  }
}
for (const key of DESIGN_COLORS) {
  if (design[key] === undefined) continue
  if (!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(design[key])) fail(`design.${key} must be a hex colour`)
}
if (design.radius !== undefined && !DESIGN_RADIUS.includes(design.radius)) fail('design.radius must be none|sm|md|lg')
if (design.lineHeight !== undefined) {
  const value = design.lineHeight
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1.4 || value > 2.4) {
    fail('design.lineHeight must be a number between 1.4 and 2.4')
  }
}

/* --- build ----------------------------------------------------------------- */
const BUILD_KEYS = [
  'baseDirectory', 'buildCommand', 'buildPack', 'dockerfileLocation', 'healthCheckPath',
  'installCommand', 'isStatic', 'port', 'publishDirectory', 'startCommand',
]
const COMMAND_PATTERN = /^(?:pnpm|npm|yarn|bun|node|npx|next|vite|astro|nuxt|remix|gatsby|serve)(?:\s+[A-Za-z0-9@._:/=,+-]+)*$/
const PATH_PATTERN = /^\/?[A-Za-z0-9._/-]+$/
const build = manifest.build
if (!build || typeof build !== 'object' || Array.isArray(build)) {
  fail('build must be an object')
} else {
  for (const key of Object.keys(build)) {
    if (!BUILD_KEYS.includes(key)) fail(`build.${key} is not accepted by the platform parser`)
  }
  if (build.buildPack !== 'dockerfile' || build.dockerfileLocation !== 'Dockerfile') {
    fail('build must use the repository Dockerfile (buildPack: dockerfile, dockerfileLocation: Dockerfile)')
  }
  if (build.healthCheckPath !== '/api/health') fail('build.healthCheckPath must be /api/health')
  const port = Number(build.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail('build.port must be an integer from 1 to 65535')
  for (const key of ['installCommand', 'buildCommand', 'startCommand']) {
    const value = build[key]
    if (typeof value !== 'string' || !COMMAND_PATTERN.test(value.trim())) {
      fail(`build.${key} must be a plain package-manager command`)
    }
  }
  if (typeof build.baseDirectory !== 'string' || !PATH_PATTERN.test(build.baseDirectory) || build.baseDirectory.includes('..')) {
    fail('build.baseDirectory must be a safe path starting with /')
  }
  if (build.isStatic !== false) fail('build.isStatic must be false: the theme reads the CMS at runtime')
}

/* --- deployment ------------------------------------------------------------ */
const deployment = manifest.deployment
if (!deployment || typeof deployment !== 'object' || Array.isArray(deployment)) {
  fail('deployment must be an object')
} else {
  for (const key of Object.keys(deployment)) {
    if (!['registryImageRepository', 'registryProvider', 'registryVisibility', 'strategy'].includes(key)) {
      fail(`deployment.${key} is not accepted by the platform parser`)
    }
  }
  if (deployment.strategy !== 'registry_image') fail('deployment.strategy must be registry_image (CI pushes the image the CMS deploys)')
  if (deployment.registryProvider !== 'ghcr') fail('deployment.registryProvider must be ghcr')
  if (deployment.registryImageRepository !== IMAGE) {
    fail(`deployment.registryImageRepository must be ${IMAGE} — it is compared against the tag CI pushes`)
  }
  if (!['public', 'private'].includes(deployment.registryVisibility)) {
    fail('deployment.registryVisibility must be public or private')
  }
}

/* --- env ------------------------------------------------------------------- */
const PLATFORM_ENV_KEYS = [
  'ESHOBE_CMS_URL', 'ESHOBE_SITE_DOMAIN', 'ESHOBE_SITE_ID', 'ESHOBE_API_KEY',
  'ESHOBE_DEFAULT_LOCALE', 'ESHOBE_LOCALES', 'ESHOBE_SITE_TYPE', 'ESHOBE_CURRENCY',
  'ESHOBE_REVALIDATE_SECRET', 'ESHOBE_CONTRACT_VERSION', 'ESHOBE_PUBLIC_ORIGIN',
]
const env = manifest.env
if (!Array.isArray(env) || env.length === 0) {
  fail('env must be a non-empty array: the theme must declare what it reads')
} else {
  if (env.length > 50) fail('env has more than 50 entries')
  const seen = new Set()
  for (const [index, entry] of env.entries()) {
    if (!entry || typeof entry !== 'object') {
      fail(`env[${index}] must be an object`)
      continue
    }
    const key = entry.key
    if (typeof key !== 'string' || !/^[A-Z][A-Z0-9_]{0,63}$/.test(key)) {
      fail(`env[${index}].key must be uppercase letters, digits and underscores`)
      continue
    }
    if (seen.has(key)) fail(`env: ${key} is declared twice`)
    seen.add(key)
    if (entry.source !== 'platform' && entry.source !== 'tenant') {
      fail(`env.${key}.source must be platform or tenant`)
    }
    if (entry.source === 'tenant' && PLATFORM_ENV_KEYS.includes(key)) {
      fail(`env.${key} is written by the platform and cannot be source: "tenant"`)
    }
    if (typeof entry.secret !== 'boolean' || typeof entry.required !== 'boolean') {
      fail(`env.${key} must declare both "secret" and "required" as booleans`)
    }
  }
  if (!seen.has('ESHOBE_CMS_URL')) fail('env must declare ESHOBE_CMS_URL (the theme reads it)')
}

/* --- settings (a manifest question must be answerable) --------------------- */
const SETTING_TYPES = ['boolean', 'text', 'number', 'select']
const settings = manifest.settings
if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
  fail('settings must be an object keyed by setting name')
} else {
  const entries = Object.entries(settings)
  if (entries.length > 50) fail('settings must have at most 50 entries')
  for (const [key, value] of entries) {
    if (!/^[a-z][A-Za-z0-9]{0,63}$/.test(key)) fail(`settings key "${key}" is not a lowerCamel identifier`)
    if (!value || typeof value !== 'object') {
      fail(`settings.${key} must be an object`)
      continue
    }
    if (!SETTING_TYPES.includes(value.type)) fail(`settings.${key}.type must be one of ${SETTING_TYPES.join(', ')}`)
    if (value.type === 'select') {
      if (!Array.isArray(value.options) || value.options.length === 0) {
        fail(`settings.${key}.options is required for a select`)
      } else {
        for (const option of value.options) {
          if (typeof option?.value !== 'string' || option.value.length === 0 || option.value.length > 100) {
            fail(`settings.${key}.options has an entry without a usable value`)
          }
        }
        if (value.default !== undefined && !value.options.some((option) => option?.value === value.default)) {
          fail(`settings.${key}.default must be one of the options`)
        }
      }
    }
    if (value.type === 'number') {
      if (typeof value.default !== 'number' || !Number.isFinite(value.default)) fail(`settings.${key}.default must be a finite number`)
      for (const bound of ['min', 'max']) {
        if (value[bound] !== undefined && typeof value[bound] !== 'number') fail(`settings.${key}.${bound} must be a number`)
      }
      if (typeof value.min === 'number' && typeof value.max === 'number' && value.min > value.max) {
        fail(`settings.${key}.min is greater than its max`)
      }
    }
    if (value.type === 'boolean' && value.default !== undefined && typeof value.default !== 'boolean') {
      fail(`settings.${key}.default must be a boolean`)
    }
    if (value.type === 'text' && value.default !== undefined && typeof value.default !== 'string') {
      fail(`settings.${key}.default must be a string`)
    }
  }
}

/* --- content slots --------------------------------------------------------- */
const SLOT_TYPES = ['page', 'post', 'category', 'form', 'media']
const slots = manifest.contentSlots
const slotKeys = new Set()
if (!Array.isArray(slots) || slots.length === 0) {
  fail('contentSlots must be a non-empty array')
} else {
  if (slots.length > 50) fail('contentSlots must have at most 50 entries')
  for (const [index, entry] of slots.entries()) {
    if (!entry || typeof entry !== 'object') {
      fail(`contentSlots[${index}] must be an object`)
      continue
    }
    const key = entry.key
    if (typeof key !== 'string' || !/^[a-z][A-Za-z0-9]{0,63}$/.test(key)) {
      fail(`contentSlots[${index}].key must be a lowerCamel identifier`)
      continue
    }
    if (slotKeys.has(key)) fail(`contentSlots: ${key} is declared twice`)
    slotKeys.add(key)
    if (!SLOT_TYPES.includes(entry.type)) fail(`contentSlots.${key}.type must be one of ${SLOT_TYPES.join(', ')}`)
    if (typeof entry.required !== 'boolean') fail(`contentSlots.${key}.required must be a boolean`)
    for (const label of ['labelFa', 'labelEn', 'help']) {
      if (entry[label] !== undefined && typeof entry[label] !== 'string') {
        fail(`contentSlots.${key}.${label} must be a string`)
      }
    }
  }
}

/* --- cross-checks against the theme's own code ----------------------------- */
const sections = read('src/lib/theme/sections.ts')
for (const match of sections.matchAll(/slot: '([^']+)'/g)) {
  if (!slotKeys.has(match[1])) fail(`src/lib/theme/sections.ts binds slot "${match[1]}", which the manifest does not declare`)
}

// Settings parity, both directions. Every *declared* setting must be consumed somewhere
// in src/ (a generated form question nobody reads is a promise nobody keeps), and every
// setting *read* from the descriptor must be declared (a question the platform never
// asks can never be answered). Reads happen in two shapes: `raw.key` where the value is
// coerced (src/lib/theme/settings.ts) and `settings.key` where a component resolves it
// directly (the map block).
const sourceFiles = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.(ts|tsx)$/.test(entry)) sourceFiles.push(readFileSync(full, 'utf8'))
  }
}
walk(join(root, 'src'))

// Only files that touch the site's descriptor (`themeRuntime.settings`) can teach us a
// setting read: other files' `raw` and `settings` identifiers are strings, Response
// objects and React state, and a loose regex would flag `raw.trim` as a setting.
const descriptorSources = sourceFiles.filter((source) => source.includes('themeRuntime'))

const readPattern = (key) => new RegExp("(?:settings|raw)\\.[\\[(']?['\"`]?" + key + '\\b')
for (const key of Object.keys(settings ?? {})) {
  if (!descriptorSources.some((source) => readPattern(key).test(source))) {
    fail(`settings.${key} is declared but never read in src/ (add the consumer or remove the question)`)
  }
}

const camel = /^[a-z][A-Za-z0-9]*$/
for (const source of descriptorSources) {
  for (const match of source.matchAll(/\braw\.([a-z][A-Za-z0-9]*)\b/g)) {
    if (!settings?.[match[1]]) {
      fail(`src/ reads setting "${match[1]}" which the manifest does not declare (the tenant form is generated from the manifest)`)
    }
  }
  for (const match of source.matchAll(/\bsettings\.([a-z][A-Za-z0-9]*)\b/g)) {
    const key = match[1]
    if (!camel.test(key)) continue
    if (!(settings ?? {})[key]) {
      fail(`src/ reads setting "${key}" which the manifest does not declare`)
    }
  }
}

// The manifest promises `healthCheckPath: /api/health`, and the platform's rollout
// judgement depends on it: Coolify's probe and the CMS deploy verifier both ask that
// route while the site is still coming up. An endpoint that reads the CMS would report a
// healthy container as failed during an upstream outage — so this is where the promise
// that it does not is enforced.
const health = read('src/app/api/health/route.ts')
if (/from '@\/lib\/cms/.test(health)) {
  fail('build.healthCheckPath promises a probe that answers during a CMS outage: /api/health must not import the CMS client')
}
if (/fetch\(/.test(health)) fail('/api/health must not contact any remote service')
if (!/ok: true/.test(health)) fail('/api/health must answer { ok: true }')
if (!/force-dynamic/.test(health)) fail('/api/health must be force-dynamic, never a cached prerender')

if (errors.length) {
  for (const message of errors) console.error(`eshobe.theme.json: ${message}`)
  process.exit(1)
}

console.log(`eshobe.theme.json is valid for the Eshobe registry-image contract (${IMAGE})`)
