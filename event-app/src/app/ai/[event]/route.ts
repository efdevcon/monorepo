import { mirrorCatalogue } from "@/data/ai/catalogueMirror";

type Params = { params: Promise<{ event: string }> };

/** `GET /ai/<event>`: the AI catalogue's index, mirrored from devcon-api (see catalogueMirror.ts). */
export async function GET(request: Request, { params }: Params) {
  const { event } = await params;
  return mirrorCatalogue(request, event, "index");
}
