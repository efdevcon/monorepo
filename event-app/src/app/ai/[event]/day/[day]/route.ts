import { mirrorCatalogue } from "@/data/ai/catalogueMirror";

type Params = { params: Promise<{ event: string; day: string }> };

/** `GET /ai/<event>/day/<n>`: one event day's sessions, mirrored from devcon-api. */
export async function GET(request: Request, { params }: Params) {
  const { event, day } = await params;
  return mirrorCatalogue(request, event, "day", day);
}
