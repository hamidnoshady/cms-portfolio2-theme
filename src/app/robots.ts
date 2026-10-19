import type { MetadataRoute } from 'next'

import { getSiteOrNull } from '@/lib/cms/endpoints'

/**
 * Runtime-rendered on purpose: a build-time prerender answers without a CMS and *freezes*
 * "no robots at all" into the image, which would make a production site unindexable.
 * The file is read exactly once by the crawler and the descriptor is tag-cached, so
 * there is no load reason to cache a wrong answer cost-free.
 */
export const dynamic = 'force-dynamic'

/** Per-site robots. Unreachable or non-serving sites are closed entirely. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSiteOrNull()
  if (!site || site.status !== 'active') {
    return { rules: [{ disallow: '/', userAgent: '*' }] }
  }
  return {
    rules: [
      {
        // The theme has no search or checkout: `/api/*` is a relay, never a page.
        disallow: ['/api/'],
        userAgent: '*',
      },
    ],
    sitemap: `https://${site.domain}/sitemap.xml`,
  }
}
