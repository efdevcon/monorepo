import { default as Slugify } from "slugify";

export function slugify(value: string) {
  return Slugify(value, { strict: true, lower: true });
}
