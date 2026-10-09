import { mirrorCatalogue } from "@/data/ai/catalogueMirror";

/** `GET /ai?event=devcon8`: the AI catalogue's index, mirrored from devcon-api (see catalogueMirror.ts). */
export async function GET(request: Request) {
  return mirrorCatalogue(request, false);
}
