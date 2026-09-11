import { strFromU8, unzipSync } from "fflate";

/**
 * The QR payload of an Apple Wallet pass (`.pkpass`), read without rendering
 * anything: the file is a zip whose `pass.json` lists its barcodes, and Pretix
 * puts the position secret in the QR barcode's `message`. Null when the file
 * is not a pass or carries no barcode. Pure, so it is unit-tested in node.
 */
export function readPassBarcode(zipBytes: Uint8Array): string | null {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(zipBytes);
  } catch {
    return null;
  }
  const entry = files["pass.json"];
  if (!entry) return null;
  let pass: { barcodes?: unknown; barcode?: unknown };
  try {
    pass = JSON.parse(strFromU8(entry)) as typeof pass;
  } catch {
    return null;
  }
  const list = Array.isArray(pass.barcodes) ? pass.barcodes : pass.barcode ? [pass.barcode] : [];
  const barcodes = list.filter(
    (b): b is { message: string; format?: string } =>
      !!b && typeof b === "object" && typeof (b as { message?: unknown }).message === "string"
  );
  // Prefer the QR entry; older passes have a single `barcode` of any format.
  const chosen = barcodes.find((b) => /qr/i.test(b.format ?? "")) ?? barcodes[0];
  const message = chosen?.message.trim();
  return message ? message : null;
}
