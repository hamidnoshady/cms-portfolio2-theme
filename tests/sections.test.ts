import { describe, expect, it } from 'vitest'
import { categorySubtree, POST_SLOTS, resolveSectionRef, resolveSlotId, SECTIONS, sectionRouteForKind } from '@/lib/theme/sections'

const categories = [
  { id: '1', parent: null, slug: 'projects' },
  { id: '2', parent: '1', slug: 'residential' },
  { id: '3', parent: '2', slug: 'villas' },
  { id: '4', parent: null, slug: 'press' },
  { id: '5', parent: '4', slug: 'interviews' },
]

describe('content-slot resolution', () => {
  it('prefers a saved binding over the slug hint', () => {
    expect(resolveSectionRef('about', { about: { id: '42', slug: 'x', title: 'About' } })).toMatchObject({ by: 'binding', id: '42' })
  })
  it('falls back to the slug only while the slot is unbound', () => {
    expect(resolveSectionRef('about', {})).toMatchObject({ by: 'slug', slug: 'about' })
    expect(resolveSectionRef('contact', null)).toMatchObject({ by: 'slug', slug: 'contact' })
  })
  it('never substitutes an unrelated document when a binding is empty', () => {
    expect(resolveSectionRef('projects', { projectsCategory: null })).toMatchObject({ by: 'slug', slug: 'projects' })
  })
  it('declares exactly the slots the manifest names', () => {
    expect(Object.keys(SECTIONS).sort()).toEqual(['about', 'contact', 'home', 'projects'])
    expect(POST_SLOTS).toEqual(['leadWork'])
  })
  it('resolves a bound post-type slot by id', () => {
    expect(resolveSlotId('leadWork', { leadWork: { id: 'p-3', slug: 'x', title: 'Lead' } })).toBe('p-3')
    expect(resolveSlotId('leadWork', {})).toBeNull()
  })
})

describe('category math', () => {
  it('collects a whole subtree, at any depth', () => {
    expect(categorySubtree(categories[0]!, categories).map((c) => c.id)).toEqual(['2', '3'])
  })
  it('keeps unrelated root subtrees separate', () => {
    expect(categorySubtree(categories[3]!, categories).map((c) => c.id)).toEqual(['5'])
  })
  it('tolerates cycles', () => {
    const cyclic = [{ id: 'a', parent: 'b', slug: 'a' }, { id: 'b', parent: 'a', slug: 'b' }]
    expect(() => categorySubtree(cyclic[0]!, cyclic)).not.toThrow()
  })
})

describe('canonical section per route kind', () => {
  it('maps the work kind onto the projects section', () => {
    expect(sectionRouteForKind('project')).toBe('projects')
    expect(sectionRouteForKind('page')).toBeNull()
  })
})
