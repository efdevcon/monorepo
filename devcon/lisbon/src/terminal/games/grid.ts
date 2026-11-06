// A frame for the games: the field is a cols × rows text grid, but most things
// are drawn on a pixel layer twice as tall (each cell is a top and a bottom
// half), which comes out as the half-block glyphs the screen draws as geometry.
// Half-cell pixels are close to square on this font, so motion reads evenly.

import { Style } from '../screen'
import { halves } from '../logo'

export type Row = Array<[string, Style?]>

/** Pixel brightness: 1 full, 2, 3, 4 faintest (the half-block shade levels); 0 off. */
export type Level = 0 | 1 | 2 | 3 | 4

export class Grid {
  /** Pixel rows: twice the text rows. */
  readonly h: number
  private px: Uint8Array
  private text: Array<{ ch: string; s: Style } | undefined>

  constructor(
    readonly cols: number,
    readonly rows: number,
  ) {
    this.h = rows * 2
    this.px = new Uint8Array(cols * this.h)
    this.text = new Array(cols * rows)
  }

  /** Light a pixel; where two things overlap the brighter wins. */
  dot(x: number, y: number, level: Level = 1) {
    x = Math.floor(x)
    y = Math.floor(y)
    if (!level || x < 0 || y < 0 || x >= this.cols || y >= this.h) return
    const i = y * this.cols + x
    if (!this.px[i] || level < this.px[i]) this.px[i] = level
  }

  /** A filled rectangle of pixels. */
  fill(x: number, y: number, w: number, h: number, level: Level = 1) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.dot(x + i, y + j, level)
  }

  /**
   * A sprite from strings: '#' at `level`, '+' one step dimmer, ':' two steps
   * dimmer, '.' faintest; anything else is transparent. (x, y) is its top-left pixel.
   */
  sprite(x: number, y: number, art: readonly string[], level: Level = 1) {
    const shade: Record<string, Level> = { '#': level, '+': Math.min(4, level + 1) as Level, ':': Math.min(4, level + 2) as Level, '.': 4 }
    art.forEach((line, j) => {
      for (let i = 0; i < line.length; i++) if (shade[line[i]]) this.dot(x + i, y + j, shade[line[i]])
    })
  }

  /** Text on a cell row (wins over pixels in those cells). */
  write(col: number, row: number, s: string, style: Style = Style.Normal) {
    if (row < 0 || row >= this.rows) return
    for (let i = 0; i < s.length; i++) {
      const c = col + i
      if (c >= 0 && c < this.cols) this.text[row * this.cols + c] = { ch: s[i], s: style }
    }
  }

  /** Text centred on a row. */
  centre(row: number, s: string, style: Style = Style.Normal) {
    this.write(Math.floor((this.cols - s.length) / 2), row, s, style)
  }

  rowsOut(): Row[] {
    const out: Row[] = []
    for (let r = 0; r < this.rows; r++) {
      const row: Row = []
      const push = (ch: string, s: Style) => {
        const tail = row[row.length - 1]
        if (tail && tail[1] === s) tail[0] += ch
        else row.push([ch, s])
      }
      for (let c = 0; c < this.cols; c++) {
        const t = this.text[r * this.cols + c]
        if (t) {
          push(t.ch, t.s)
          continue
        }
        const top = this.px[2 * r * this.cols + c]
        const bottom = this.px[(2 * r + 1) * this.cols + c]
        if (top || bottom) push(halves(top, bottom), Style.Bright)
        else push(' ', Style.Normal)
      }
      out.push(row)
    }
    return out
  }
}
