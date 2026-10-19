import { cache } from "react";
import { cmsGet, published } from "./client";
import { buildSnapshot, type FormDoc, type PageDoc, type PostDoc, type SiteDoc, type Snapshot } from "./map";

type Binding = { id?: string } | null | undefined;
type SiteDescriptor = SiteDoc & {
  defaultLocale?: string;
  themeRuntime?: { settings?: Record<string, unknown> | null; bindings?: Record<string, Binding> | null } | null;
};
type Docs<T> = { docs?: T[] };

const PAGE_SLOTS = ["home", "about", "careers", "legal", "contact"] as const;

/**
 * One tenant snapshot per request. Bound documents are looked up by id (stable);
 * the section key is only a first-run hint when a slot is unbound (THEME_API §17b).
 */
export const loadSnapshot = cache(async (): Promise<Snapshot> => {
  const site = await cmsGet<SiteDescriptor>("/api/site");
  const bindings = site.themeRuntime?.bindings ?? {};
  const locale = { locale: site.defaultLocale ?? "en", fallbackLocale: "false" };

  const page = async (key: string): Promise<PageDoc> => {
    const id = bindings[key]?.id;
    if (id) {
      const doc = await cmsGet<PageDoc & { _status?: string }>(`/api/pages/${id}`, { ...locale, depth: 2 });
      return doc._status === "published" ? doc : null;
    }
    const hit = await cmsGet<Docs<PageDoc>>("/api/pages", { ...locale, ...published, "where[slug][equals]": key, depth: 2, limit: 1 });
    return hit.docs?.[0] ?? null;
  };

  const formId = bindings.contactForm?.id;
  const [pages, form, posts] = await Promise.all([
    Promise.all(PAGE_SLOTS.map(page)),
    formId ? cmsGet<FormDoc>(`/api/forms/${formId}`, { ...locale, depth: 0 }) : null,
    cmsGet<Docs<PostDoc>>("/api/posts", { ...locale, ...published, sort: "-publishedAt", depth: 2, limit: 100 }),
  ]);

  return buildSnapshot({
    site,
    pages: Object.fromEntries(PAGE_SLOTS.map((k, i) => [k, pages[i]])),
    form,
    posts: posts.docs ?? [],
  });
});
