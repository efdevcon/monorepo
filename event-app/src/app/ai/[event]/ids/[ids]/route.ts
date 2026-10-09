import { mirrorCatalogue } from "@/data/ai/catalogueMirror";

type Params = { params: Promise<{ event: string; ids: string }> };

/** `GET /ai/<event>/ids/<CODE,CODE>`: full details for a few sessions, mirrored from devcon-api; a path so the CDN caches it. */
export async function GET(request: Request, { params }: Params) {
  const { event, ids } = await params;
  return mirrorCatalogue(request, event, "ids", ids);
}
