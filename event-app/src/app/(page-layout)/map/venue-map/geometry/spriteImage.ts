"use client";

import { useEffect, useState } from "react";
import { CanvasTexture, SRGBColorSpace, type Texture } from "three";

/**
 * A sprite image (theme PNG or a Community Hub's SVG mark) rasterised once
 * onto a square canvas: the texture, its aspect and a per-pixel alpha
 * lookup for the hit test, so hovers and taps only register on the drawn
 * part of the quad. Cached per URL; the SVG marks ship with width/height, so
 * the browser rasterises them at the canvas size (sharp at any zoom the map
 * reaches). Same-origin files only (public/), served through the image cache.
 */
export type SpriteImage = { texture: Texture; aspect: number; alphaAt: (u: number, v: number) => number };

const SIZE = 256;
/** Alpha (0–255) below which a pixel doesn't count as a hit. */
export const ALPHA_HIT = 40;

const cache = new Map<string, Promise<SpriteImage>>();

function load(url: string): Promise<SpriteImage> {
  let p = cache.get(url);
  if (!p) {
    p = new Promise<SpriteImage>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        const aspect = img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
        const w = aspect >= 1 ? SIZE : Math.max(1, Math.round(SIZE * aspect));
        const h = aspect >= 1 ? Math.max(1, Math.round(SIZE / aspect)) : SIZE;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no 2d context"));
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const texture = new CanvasTexture(canvas);
        texture.colorSpace = SRGBColorSpace;
        resolve({ texture, aspect, alphaAt: (u, v) => data[(Math.min(h - 1, Math.max(0, Math.floor((1 - v) * h))) * w + Math.min(w - 1, Math.max(0, Math.floor(u * w)))) * 4 + 3] });
      };
      img.onerror = () => reject(new Error(`sprite image failed: ${url}`));
      img.src = url;
    });
    cache.set(url, p);
  }
  return p;
}

/** The rasterised sprite image, or null until it has loaded (a failed load stays null). */
export function useSpriteImage(url: string): SpriteImage | null {
  const [image, setImage] = useState<SpriteImage | null>(null);
  useEffect(() => {
    let live = true;
    load(url).then(
      (img) => live && setImage(img),
      () => live && setImage(null)
    );
    return () => {
      live = false;
    };
  }, [url]);
  return image;
}
