import { proxyGet } from "@/lib/cms/proxy";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ segments: string[] }> };

export async function GET(request: Request, { params }: Ctx) {
  return proxyGet(request, (await params).segments);
}

export const HEAD = GET;
