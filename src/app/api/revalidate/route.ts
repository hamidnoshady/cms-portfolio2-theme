import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { CMS_TAG } from "@/lib/cms/client";

export const dynamic = "force-dynamic";

const MAX_BODY = 64 * 1024;

/**
 * CMS → theme cache purge (THEME_API §17b). The signature is HMAC-SHA256 over the raw
 * body only; `x-eshobe-timestamp` is sent but deliberately not signed in contract v1.
 * The body's own `tags`/`paths` are never trusted — only this theme's single CMS tag is purged.
 */
export async function POST(request: Request) {
  const secret = process.env.ESHOBE_REVALIDATE_SECRET;
  if (!secret) return Response.json({ ok: false }, { status: 503 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ ok: false }, { status: 413 });

  const given = (request.headers.get("x-eshobe-signature") ?? "").replace(/^sha256=/, "");
  const want = createHmac("sha256", secret).update(raw).digest("hex");
  if (given.length !== want.length || !timingSafeEqual(Buffer.from(given), Buffer.from(want))) {
    return Response.json({ ok: false }, { status: 401 });
  }

  let siteId: unknown;
  try {
    siteId = (JSON.parse(raw) as { siteId?: unknown }).siteId;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const mine = process.env.ESHOBE_SITE_ID;
  if (mine && siteId && siteId !== mine) return Response.json({ ok: true, purged: false });

  revalidateTag(CMS_TAG, "max");
  return Response.json({ ok: true, purged: true });
}
