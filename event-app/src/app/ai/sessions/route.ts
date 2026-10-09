import { mirrorCatalogue } from "@/data/ai/catalogueMirror";

/** `GET /ai/sessions?event=devcon8&day=2`: one day's (or a filtered) session list, mirrored from devcon-api. */
export async function GET(request: Request) {
  return mirrorCatalogue(request, true);
}
