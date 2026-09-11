import { decodeQr, type RgbaImage } from "./qrDecode";
import { readPassBarcode } from "./passBarcode";

/** Longest side drawn to the canvas; phone screenshots are ~1200x2600. */
const MAX_SIDE = 2000;
/** A ticket PDF puts the QR on the first page; a couple more covers multi-ticket exports. */
const MAX_PDF_PAGES = 3;

/** What the picker offers: screenshots and photos, the ticket PDF, the wallet pass. */
export const ACCEPTED_TICKET_FILES =
  "image/*,.pdf,application/pdf,.pkpass,application/vnd.apple.pkpass";

/**
 * Image formats a browser may refuse to decode: HEIC/HEIF (iPhone photos)
 * outside Safari, TIFF almost everywhere. Used for a specific failure message.
 */
export function isUnsupportedPhotoFormat(file: Blob): boolean {
  const name = "name" in file ? String((file as File).name).toLowerCase() : "";
  const type = file.type.toLowerCase();
  return (
    /^image\/(heic|heif|tiff)/.test(type) ||
    /\.(heic|heif|tif|tiff)$/.test(name)
  );
}

/**
 * Read a ticket's QR payload from a picked file (browser only; imported
 * dynamically by the attach card so none of this is in the main bundle):
 * - an image (screenshot, photo): scanned with jsQR;
 * - a `.pkpass` wallet pass: the payload is text inside the zip, no scan;
 * - a PDF: pages rendered with pdf.js (loaded on demand) and scanned.
 * Null when nothing decodes.
 */
export async function decodeQrFromFile(file: Blob): Promise<string | null> {
  switch (fileKind(file)) {
    case "pkpass":
      return readPassBarcode(new Uint8Array(await file.arrayBuffer()));
    case "pdf":
      return decodeFromPdf(file);
    default:
      return decodeFromImage(file);
  }
}

function fileKind(file: Blob): "pkpass" | "pdf" | "image" {
  const name = "name" in file ? String((file as File).name).toLowerCase() : "";
  const type = file.type.toLowerCase();
  if (type === "application/vnd.apple.pkpass" || name.endsWith(".pkpass")) return "pkpass";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  return "image";
}

function scanCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): string | null {
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const image: RgbaImage = { data, width: canvas.width, height: canvas.height };
  return decodeQr(image);
}

async function decodeFromImage(file: Blob): Promise<string | null> {
  const source = await loadImage(file);
  if (!source) return null;
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(source.width, source.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source.bitmap, 0, 0, canvas.width, canvas.height);
    return scanCanvas(canvas, ctx);
  } finally {
    source.release();
  }
}

async function decodeFromPdf(file: Blob): Promise<string | null> {
  // Legacy build: the modern one needs Promise.withResolvers, missing from
  // iOS before 17.4. The worker ships as a static asset via the URL import.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  try {
    const pages = Math.min(doc.numPages, MAX_PDF_PAGES);
    for (let number = 1; number <= pages; number++) {
      const page = await doc.getPage(number);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: MAX_SIDE / Math.max(base.width, base.height) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      await page.render({ canvasContext: ctx, canvas, viewport }).promise;
      const found = scanCanvas(canvas, ctx);
      page.cleanup();
      if (found) return found;
    }
    return null;
  } finally {
    // Tears down the document and its worker.
    await task.destroy();
  }
}

interface LoadedImage {
  bitmap: CanvasImageSource;
  width: number;
  height: number;
  release(): void;
}

async function loadImage(file: Blob): Promise<LoadedImage | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through: some Safari builds reject certain PNGs here.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return {
      bitmap: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}
