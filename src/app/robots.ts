import { siteOrigin } from "@/lib/cms/client";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = siteOrigin();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`,
  };
}
