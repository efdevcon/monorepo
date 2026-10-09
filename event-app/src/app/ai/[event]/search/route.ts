import { mirrorCatalogue } from "@/data/ai/catalogueMirror";

type Params = { params: Promise<{ event: string }> };

/** `GET /ai/<event>/search?q=…&day=…&ids=…`: a filtered list, mirrored from devcon-api; never CDN-cached (query string). */
export async function GET(request: Request, { params }: Params) {
  const { event } = await params;
  return mirrorCatalogue(request, event, "search");
}
