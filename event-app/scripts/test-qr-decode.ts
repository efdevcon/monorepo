// Decoder tests on synthetic screenshots. Run: pnpm qr:test
import QRCode from "qrcode";
import sharp from "sharp";
import { decodeQr, type RgbaImage } from "../src/data/tickets/qrDecode";

let failed = 0;
const check = (label: string, ok: boolean, note = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${note ? ` (${note})` : ""}`);
};

// 32 chars, like a Pretix position secret.
const SECRET = "abcdefghijklmnopqrstuvwxyz012345";

interface Shot {
  width: number;
  height: number;
  qrSize: number;
  left: number;
  top: number;
  dark?: boolean;
}

async function screenshot(opts: Shot): Promise<RgbaImage> {
  const qr = await QRCode.toBuffer(SECRET, {
    width: opts.qrSize,
    margin: 2,
    type: "png",
    color: opts.dark ? { dark: "#ffffffff", light: "#000000ff" } : undefined,
  });
  const background = opts.dark
    ? { r: 0, g: 0, b: 0, alpha: 1 }
    : { r: 245, g: 241, b: 254, alpha: 1 };
  const { data } = await sharp({
    create: { width: opts.width, height: opts.height, channels: 4, background },
  })
    .composite([{ input: qr, left: opts.left, top: opts.top }])
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length),
    width: opts.width,
    height: opts.height,
  };
}

function blank(width: number, height: number): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 240;
    data[i + 1] = 240;
    data[i + 2] = 240;
    data[i + 3] = 255;
  }
  return { data, width, height };
}

const timed = (image: RgbaImage) => {
  const t0 = Date.now();
  const text = decodeQr(image);
  return { text, ms: Date.now() - t0 };
};

async function main() {
  let r = timed(await screenshot({ width: 1170, height: 2532, qrSize: 640, left: 265, top: 700 }));
  check("phone screenshot, large QR", r.text === SECRET, `${r.ms} ms`);
  r = timed(await screenshot({ width: 1170, height: 2532, qrSize: 180, left: 80, top: 1900 }));
  check("phone screenshot, small QR in a corner (crop pass)", r.text === SECRET, `${r.ms} ms`);
  r = timed(await screenshot({ width: 2560, height: 1440, qrSize: 420, left: 1500, top: 300 }));
  check("desktop screenshot, downsampled", r.text === SECRET, `${r.ms} ms`);
  r = timed(await screenshot({ width: 1170, height: 2532, qrSize: 500, left: 335, top: 900, dark: true }));
  check("inverted colours (dark mode email)", r.text === SECRET, `${r.ms} ms`);
  r = timed(blank(1170, 2532));
  check("no code present", r.text === null, `${r.ms} ms`);
  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
}

main();
