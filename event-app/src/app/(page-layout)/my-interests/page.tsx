import { PlanImport } from "@/components/interests/PlanImport";

/**
 * `/my-interests?add=A,B&remove=C`: the link an AI assistant (or anyone) writes
 * to put sessions into My Interests. Previews the changes, applies them on one
 * tap, works offline (the catalogue and the stars are local) and is precached
 * as part of the app shell (next.config.ts).
 */
export default function MyInterestsPage() {
  return <PlanImport />;
}
