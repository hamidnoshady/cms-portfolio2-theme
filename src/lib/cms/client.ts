/* ============================================================
   eshobe-cms client — server-side only
   ------------------------------------------------------------
   Mode B of the theme contract: ESHOBE_CMS_URL + ESHOBE_API_KEY
   are injected by the platform; the key *is* the tenant. Never
   read a tenant from a query param or request body.
   The key also reads drafts, so every read here filters to
   published itself (see `published`).
   ============================================================ */

export const CMS_TAG = "cms:all";

const base = () => (process.env.ESHOBE_CMS_URL ?? "").replace(/\/+$/, "");
const key = () => process.env.ESHOBE_API_KEY ?? "";

/** CMS mode is on when the platform injected credentials; otherwise the local Drizzle fixture serves. */
export const cmsEnabled = () => Boolean(base() && key());

export const published = { "where[_status][equals]": "published", draft: "false" } as const;

type Query = Record<string, string | number | undefined>;

async function request(path: string, init: RequestInit & { query?: Query } = {}) {
  const { query, ...rest } = init;
  const url = new URL(base() + path);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    ...rest,
    headers: { ...rest.headers, Authorization: `Bearer ${key()}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`eshobe-cms ${rest.method ?? "GET"} ${path} → ${res.status}`);
  return res;
}

export async function cmsGet<T>(path: string, query?: Query): Promise<T> {
  // ponytail: 30 s TTL + tag purge from POST /api/revalidate; no per-resource tags.
  const res = await request(path, { query, next: { revalidate: 30, tags: [CMS_TAG] } });
  return (await res.json()) as T;
}

export async function cmsPost<T>(path: string, body: unknown): Promise<T> {
  const res = await request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return (await res.json()) as T;
}

/** Public origin of this deployment (canonical URLs, sitemap). */
export function siteOrigin() {
  const domain = process.env.ESHOBE_SITE_DOMAIN;
  return (
    process.env.ESHOBE_PUBLIC_ORIGIN ??
    (domain ? `https://${domain}` : undefined) ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

/** Stream a CMS-owned path (GET/HEAD only). Visitor cookies/authorization are never forwarded. */
export async function cmsProxy(path: string, search: string, method: "GET" | "HEAD", headers: Record<string, string>) {
  const res = await fetch(base() + path + search, {
    method,
    headers: { ...headers, Authorization: `Bearer ${key()}` },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  // fetch() has already decoded the body — drop encoding/length so the browser doesn't double-decode.
  const out = new Headers(res.headers);
  for (const h of ["content-encoding", "content-length", "transfer-encoding", "connection"]) out.delete(h);
  return new Response(res.body, { status: res.status, headers: out });
}
