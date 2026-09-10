import jsQR from "jsqr";

/** Raw RGBA pixels, the shape `CanvasRenderingContext2D.getImageData` returns. */
export interface RgbaImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Full-frame passes above this are wasted work: a QR fills a fraction of a screenshot. */
const MAX_FULL_SIDE = 1600;
/** Extra downsample passes: finder patterns show up at different scales. */
const SCALE_PASSES = [1200, 800];

/**
 * Find a QR code in a screenshot (spec: decoded on the device). Passes,
 * cheapest first: the frame capped at 1600px, two downsampled copies, then
 * nine overlapping half-size crops so a small code in a corner still fills
 * enough of the frame for jsQR. `attemptBoth` handles dark-mode tickets.
 * Returns the decoded text, or null when no code was found.
 */
export function decodeQr(image: RgbaImage): string | null {
  const base =
    Math.max(image.width, image.height) > MAX_FULL_SIDE
      ? downsample(image, MAX_FULL_SIDE)
      : image;
  const hit = scan(base);
  if (hit) return hit;
  for (const side of SCALE_PASSES) {
    if (side >= Math.max(base.width, base.height)) continue;
    const found = scan(downsample(base, side));
    if (found) return found;
  }
  for (const tile of crops(base)) {
    const found = scan(tile);
    if (found) return found;
  }
  return null;
}

function scan(image: RgbaImage): string | null {
  const result = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "attemptBoth",
  });
  const text = result?.data.trim();
  return text ? text : null;
}

/** Box-filter downsample so `max(width, height) === maxSide`. */
export function downsample(image: RgbaImage, maxSide: number): RgbaImage {
  const scale = maxSide / Math.max(image.width, image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor((y * image.height) / height);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * image.height) / height));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor((x * image.width) / width);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * image.width) / width));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let sy = y0; sy < y1; sy++) {
        let i = (sy * image.width + x0) * 4;
        for (let sx = x0; sx < x1; sx++, i += 4) {
          r += image.data[i];
          g += image.data[i + 1];
          b += image.data[i + 2];
          n++;
        }
      }
      const o = (y * width + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return { data: out, width, height };
}

/** Nine half-size tiles stepping by a quarter, so every point sits well inside at least one tile. */
export function crops(image: RgbaImage): RgbaImage[] {
  const w = Math.floor(image.width / 2);
  const h = Math.floor(image.height / 2);
  const tiles: RgbaImage[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      tiles.push(
        crop(
          image,
          Math.floor((col * image.width) / 4),
          Math.floor((row * image.height) / 4),
          w,
          h
        )
      );
    }
  }
  return tiles;
}

export function crop(
  image: RgbaImage,
  x: number,
  y: number,
  width: number,
  height: number
): RgbaImage {
  const out = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    const src = ((y + row) * image.width + x) * 4;
    out.set(image.data.subarray(src, src + width * 4), row * width * 4);
  }
  return { data: out, width, height };
}
