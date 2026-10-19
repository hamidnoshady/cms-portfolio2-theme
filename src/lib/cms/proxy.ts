import { cmsEnabled, cmsProxy } from "./client";

/**
 * `proxiesApi: true` — CMS-owned paths the theme re-serves on its own origin.
 * The site key can read drafts, so only the two draft-free reads THEME_API §3 names
 * are passed through; content collections never are.
 */
const allowed = (s: string[]) => (s.length === 1 && s[0] === "site") || (s[0] === "media" && s[1] === "file" && s.length > 2);

export function proxyGet(request: Request, segments: string[]) {
  if (!cmsEnabled() || !allowed(segments)) return new Response(null, { status: 404 });
  const headers: Record<string, string> = {};
  for (const h of ["accept", "accept-language", "if-none-match", "range"]) {
    const v = request.headers.get(h);
    if (v) headers[h] = v;
  }
  return cmsProxy(
    `/api/${segments.map(encodeURIComponent).join("/")}`,
    new URL(request.url).search,
    request.method === "HEAD" ? "HEAD" : "GET",
    headers,
  );
}
