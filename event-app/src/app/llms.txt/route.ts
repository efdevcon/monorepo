import { DATASETS, DEFAULT_DATASET_KEY } from "@/data/dataset";
import { CATALOGUE_CACHE_CONTROL, mirrorCatalogueUrl, requestOrigin } from "@/data/ai/catalogueMirror";

/** `/llms.txt`: where an assistant finds the programme and how it hands a plan back (the llms.txt convention). */
export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const dataset = DATASETS[DEFAULT_DATASET_KEY];
  const text = [
    `# ${dataset.label}`,
    "",
    `The event app for ${dataset.label}. The full programme for assistants, one session per line with a CODE first, is at ${mirrorCatalogueUrl(origin, dataset.eventId)} (index with one list per day and the filters).`,
    "",
    `To put sessions into an attendee's My Interests, give them this link to open and confirm: ${origin}/my-interests?add=CODE1,CODE2&remove=CODE3`,
    "",
  ].join("\n");
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": CATALOGUE_CACHE_CONTROL } });
}
