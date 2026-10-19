import { createContactMessage, listContactReasons } from "@/lib/content";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, errors: { message: "Invalid request body" } }, { status: 400 });
  }

  const input = body as { reason?: unknown; name?: unknown; email?: unknown; message?: unknown };
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";

  const validReasons = new Set((await listContactReasons()).map((r) => r.label));
  const errors: Record<string, string> = {};
  if (!validReasons.has(reason)) errors.reason = "Unknown reason";
  if (name.length < 2 || name.length > 120) errors.name = "Name must be 2–120 characters";
  if (!EMAIL_RE.test(email) || email.length > 160) errors.email = "A valid email is required";
  if (message.length < 12 || message.length > 4000) errors.message = "Message must be 12–4000 characters";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  try {
    const { id } = await createContactMessage({ reason, name, email, message });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, errors: { message: "Could not send the message" } }, { status: 502 });
  }
}
