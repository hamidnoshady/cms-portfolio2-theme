/**
 * Section-resolution rules: which `eshobe.theme.json` content slot feeds which route,
 * and what kind of document the platform is being asked to bind.
 *
 * Pure — no fetch, no Next imports — because the same rules drive routes, navigation,
 * breadcrumbs, the sitemap and the manifest validator. The CMS stores the binding
 * (`themeRuntime.bindings`); the hint slug is only the fallback when nothing is bound.
 *
 * Slots declared in `eshobe.theme.json`: `about`, `contact` (pages);
 * `projectsCategory` (category); `leadWork` (post); `contactForm` (form).
 */

export type SectionKey = 'about' | 'contact' | 'home' | 'projects'

export type SectionKind = 'category' | 'page'

export type SectionRule = {
  hint: null | string
  kind: SectionKind
  slot: string
}

export const SECTIONS: Record<SectionKey, SectionRule> = {
  home: { kind: 'page', slot: 'home', hint: 'home' },
  about: { kind: 'page', slot: 'about', hint: 'about' },
  contact: { kind: 'page', slot: 'contact', hint: 'contact' },
  projects: { kind: 'category', slot: 'projectsCategory', hint: 'projects' },
}

export const FORM_SLOTS = {
  contactForm: 'contactForm',
} as const

/** Optional single-document slots that are not pages or categories. */
export const POST_SLOTS = ['leadWork'] as const

export type BindingValue = null | { id: string; slug: null | string; title: null | string }

export type SectionRef =
  | { by: 'binding'; id: string; slug: null | string; source: 'bound' }
  | { by: 'slug'; slug: string; source: 'hint' }
  | { by: 'none'; source: 'unbound' }

export const resolveSectionRef = (
  section: SectionKey,
  bindings: Record<string, BindingValue> | null | undefined,
): SectionRef => {
  const rule = SECTIONS[section]
  const binding = bindings?.[rule.slot]
  if (binding && binding.id) {
    return { by: 'binding', id: binding.id, slug: binding.slug ?? null, source: 'bound' }
  }
  if (rule.hint) return { by: 'slug', slug: rule.hint, source: 'hint' }
  return { by: 'none', source: 'unbound' }
}

/** A non-page slot (currently the lead work) → the document id the operator picked. */
export const resolveSlotId = (
  slot: string,
  bindings: Record<string, BindingValue> | null | undefined,
): null | string => {
  const binding = bindings?.[slot]
  return binding?.id ? String(binding.id) : null
}

type CategoryDocLike = { id: string; parent?: unknown }

const idOf = (value: unknown): null | string => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
    const id = (value as Record<string, unknown>).id
    return typeof id === 'string' ? id : null
  }
  return null
}

/** Every descendant of `root`, deduplicated: a category tree with a cycle must not hang a render. */
export const categorySubtree = (root: CategoryDocLike, all: CategoryDocLike[]): CategoryDocLike[] => {
  const seen = new Set<string>([String(root.id)])
  const walk = (parent: CategoryDocLike): CategoryDocLike[] =>
    all
      .filter((candidate) => idOf(candidate.parent) === String(parent.id))
      .flatMap((child) => {
        const id = String(child.id)
        if (seen.has(id)) return []
        seen.add(id)
        return [child, ...walk(child)]
      })
  return walk(root)
}

export const categoryIds = (categories: CategoryDocLike[]): string[] => categories.map((c) => String(c.id))

export const sectionPath = (section: SectionKey): string => (section === 'home' ? '/' : `/${section}`)

export const sectionRouteForKind = (kind: 'page' | 'project'): SectionKey | null =>
  kind === 'project' ? 'projects' : null
