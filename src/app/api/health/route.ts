import { sql } from "drizzle-orm";
import { cmsEnabled } from "@/lib/cms/client";

export const dynamic = "force-dynamic";

export async function GET() {
  // CMS mode has no database of its own; liveness of the process is the health signal.
  if (cmsEnabled()) return Response.json({ ok: true });
  try {
    const { db } = await import("@/db");
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
