import type { MetadataRoute } from 'next'

import { getSiteOrNull } from '@/lib/cms/endpoints'

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
