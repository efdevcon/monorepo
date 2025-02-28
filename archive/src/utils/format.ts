import { default as Slugify } from "slugify";

export function slugify(value: string) {
  return Slugify(value, { strict: true, lower: true });
}

export const chunkArray = (array: Array<any>, n: number): Array<Array<any>> => {
  const results = [];
  const size = Math.ceil(array.length / n);
  let i = 0;

  while (i < array.length) results.push(array.slice(i, (i += size)));

  return results;
};

export function GetExcerpt(text: string, length: number = 250) {
  if (text.length > length) {
    return text.substring(0, length) + "...";
  }

  return text;
}

export function TruncateMiddle(text: string, length: number = 5) {
  if (text.length > length * 2 + 1) {
    return `${text.substring(0, length)}...${text.substring(
      text.length - length,
      text.length
    )}`;
  }

  return text;
}
