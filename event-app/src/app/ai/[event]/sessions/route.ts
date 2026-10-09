import { mirrorCatalogue } from "@/data/ai/catalogueMirror";

type Params = { params: Promise<{ event: string }> };

/** `GET /ai/<event>/sessions`: every session of the event in one page, mirrored from devcon-api. */
export async function GET(request: Request, { params }: Params) {
  const { event } = await params;
  return mirrorCatalogue(request, event, "sessions");
}
