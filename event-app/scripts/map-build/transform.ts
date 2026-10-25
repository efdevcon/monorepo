/** Affine matrix [a, b, c, d, e, f] as in SVG: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Matrix = readonly [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** Uniform scale factor of the matrix (sqrt of the determinant's magnitude), for stroke widths. */
export const scaleOf = (m: Matrix) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

/** Parses an SVG `transform` attribute (matrix, translate, scale, rotate, skewX, skewY), composed left to right. */
export function parseTransform(value: string | undefined): Matrix {
  if (!value) return IDENTITY;
  let m = IDENTITY;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    const args = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (args.some(Number.isNaN)) throw new Error(`Bad transform "${value}"`);
    let t: Matrix;
    switch (match[1]) {
      case "matrix":
        if (args.length !== 6) throw new Error(`Bad matrix "${value}"`);
        t = [args[0], args[1], args[2], args[3], args[4], args[5]];
        break;
      case "translate":
        t = [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0];
        break;
      case "scale":
        t = [args[0] ?? 1, 0, 0, args[1] ?? args[0] ?? 1, 0, 0];
        break;
      case "rotate": {
        const a = ((args[0] ?? 0) * Math.PI) / 180;
        const [cx, cy] = [args[1] ?? 0, args[2] ?? 0];
        const r: Matrix = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
        t = multiply(multiply([1, 0, 0, 1, cx, cy], r), [1, 0, 0, 1, -cx, -cy]);
        break;
      }
      case "skewX":
        t = [1, 0, Math.tan(((args[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
        break;
      default:
        t = [1, Math.tan(((args[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
    }
    m = multiply(m, t);
  }
  const rest = value.replace(/(matrix|translate|scale|rotate|skewX|skewY)\s*\([^)]*\)/g, "").replace(/[\s,]/g, "");
  if (rest !== "") throw new Error(`Unsupported transform "${value}"`);
  return m;
}
