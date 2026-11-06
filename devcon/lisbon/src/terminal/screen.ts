// A tiny character-cell terminal. It owns a scrolling buffer of styled lines
// and draws them into a 2D canvas, which the CRT pass then uses as a texture.
// Everything is drawn in greyscale; the shader adds the phosphor colour.

export const enum Style {
  Normal = 0,
  Dim = 1,
  Bright = 2,
  Inverse = 3,
}

interface Seg {
  t: string
  s: Style
}
type Line = Seg[]

const LEVEL: Record<Style, string> = {
  [Style.Normal]: '#bdbdbd',
  [Style.Dim]: '#6a6a6a',
  [Style.Bright]: '#ffffff',
  [Style.Inverse]: '#ffffff',
}

// Block and box-drawing glyphs are drawn as geometry instead of font glyphs so
// they tile seamlessly and never fall back to a mismatched system font.
const SHADE: Record<string, number> = { '█': 1, '▓': 0.72, '▒': 0.46, '░': 0.24 }
const CUSTOM = new Set([...'█▓▒░▀▄▌▐◢◣◤◥═║╔╗╚╝─│┌┐└┘├┤┬┴┼'])
const SHADE_LEVELS = [1, 0.72, 0.46, 0.24]
// U+E100–E118: half-block cell (top shade × bottom shade), emitted by logo.ts.
const isHalves = (ch: string) => ch >= '\ue100' && ch <= '\ue118'

export class Screen {
  cols = 80
  rows = 25
  lines: Line[] = [[]]
  cursor = true
  dirty = true

  readonly canvas = document.createElement('canvas')
  private ctx = this.canvas.getContext('2d')!
  private font = 'VT323'
  private fontPx = 32
  cellW = 13
  cellH = 32
  private padX = 0
  private padY = 0
  private changedAt = 0
  private lastDraw = 0
  // Line editor: the line where the current prompt starts, and whether writes
  // hard-wrap at the column (typed input) instead of at word boundaries.
  private inputAt: Line | null = null
  private hard = false

  /** Whether the last layout had to go below the glyph floor to keep 32 columns. */
  capped = false

  /**
   * Fit the grid to a pixel size. Aims for an 80×25 feel, with a floor on glyph
   * size (minCss, in CSS px) that gives way only to keep 32 columns.
   */
  layout(pxW: number, pxH: number, dpr: number, minCss = 17, flat = false) {
    this.canvas.width = pxW
    this.canvas.height = pxH
    const ctx = this.ctx
    ctx.font = `100px ${this.font}`
    const aspect = ctx.measureText('M').width / 100
    const lineH = 1.06
    // Leave room for the barrel curvature eating the edges (less on a flat tube).
    const usableW = pxW * (flat ? 0.94 : 0.9)
    const usableH = pxH * (flat ? 0.94 : 0.88)
    const minPx = minCss * dpr
    const maxPx = usableW / (32 * aspect)
    let px = Math.min(usableW / (80 * aspect), usableH / (25 * lineH))
    px = Math.max(px, minPx)
    this.capped = px > maxPx
    px = Math.min(px, maxPx)
    this.fontPx = Math.floor(px)
    this.cellW = this.fontPx * aspect
    this.cellH = Math.round(this.fontPx * lineH)
    const cols = Math.min(80, Math.floor(usableW / this.cellW))
    const rows = Math.floor(usableH / this.cellH)
    this.cols = Math.max(32, cols)
    this.rows = Math.max(12, rows)
    this.padX = Math.round((pxW - this.cols * this.cellW) / 2)
    this.padY = Math.round((pxH - this.rows * this.cellH) / 2)
    this.reflow()
    this.touch()
  }

  /** Re-wrap existing content after a resize. */
  private reflow() {
    const flat = this.lines
    this.lines = [[]]
    let inputAt: Line | null = null
    flat.forEach((line, i) => {
      if (line === this.inputAt) inputAt = this.last
      for (const seg of line) this.write(seg.t, seg.s)
      if (i < flat.length - 1) this.newline()
    })
    this.inputAt = inputAt
  }

  /** When the text last changed (not the cursor blinking), for the idle throttle. */
  editedAt = 0

  touch(edit = true) {
    this.dirty = true
    this.changedAt = performance.now()
    if (edit) this.editedAt = this.changedAt
  }

  private get last(): Line {
    return this.lines[this.lines.length - 1]
  }

  lineLength(line: Line = this.last) {
    let n = 0
    for (const s of line) n += s.t.length
    return n
  }

  newline() {
    this.lines.push([])
    // Keep a little scrollback beyond the visible rows for reflow on resize.
    if (this.lines.length > this.rows * 3) this.lines.splice(0, this.lines.length - this.rows * 3)
    this.touch()
  }

  write(text: string, style: Style = Style.Normal) {
    for (const ch of text) {
      if (ch === '\n') {
        this.newline()
        continue
      }
      if (this.lineLength() >= this.cols) {
        if (this.hard) {
          this.newline()
        } else if (ch === ' ') {
          // The space a line breaks on isn't carried to the next line.
          this.newline()
          continue
        } else {
          this.wrapWord()
        }
      }
      const line = this.last
      const tail = line[line.length - 1]
      if (tail && tail.s === style) tail.t += ch
      else line.push({ t: ch, s: style })
    }
    this.touch()
  }

  /**
   * Start a new line, carrying the last partial word down with its styles.
   * A line with no space after its indent (one word longer than the line, like
   * a long email address) breaks mid-word instead. Lines built to the exact
   * width ([  OK  ] rows, bars, the title card) never overflow, so never get here.
   */
  private wrapWord() {
    const line = this.last
    const text = line.map((s) => s.t).join('')
    const at = text.lastIndexOf(' ')
    const indent = text.length - text.trimStart().length
    this.newline()
    if (at < indent) return
    const keep: Line = []
    const carry: Line = []
    let i = 0
    for (const seg of line) {
      const end = i + seg.t.length
      if (end <= at) keep.push(seg)
      else if (i > at) carry.push(seg)
      else {
        // This segment holds the break space: split around it and drop it.
        const head = seg.t.slice(0, at - i)
        const tail = seg.t.slice(at - i + 1)
        if (head) keep.push({ t: head, s: seg.s })
        if (tail) carry.push({ t: tail, s: seg.s })
      }
      i = end
    }
    this.lines[this.lines.length - 2] = keep
    this.lines[this.lines.length - 1] = carry
  }

  writeln(text = '', style: Style = Style.Normal) {
    this.write(text, style)
    this.newline()
  }

  /** Replace the current (last) line — progress bars, spinners, input echo. */
  setLine(segs: Array<[string, Style?]>) {
    this.lines[this.lines.length - 1] = []
    for (const [t, s] of segs) this.write(t, s ?? Style.Normal)
    this.touch()
  }

  /**
   * The visible row and column under a canvas pixel (ignoring the CRT curve),
   * and how far down that cell it is (0 top, 1 bottom).
   */
  cellAt(x: number, y: number): { row: number; col: number; fy: number } {
    const rows = (y - this.padY) / this.cellH
    const row = Math.floor(rows)
    return { row, col: Math.floor((x - this.padX) / this.cellW), fy: rows - row }
  }

  /** The line on a visible row (as draw() lays them out), for hit testing. */
  lineAt(row: number): object | undefined {
    return row >= 0 && row < this.rows ? this.lines.slice(-this.rows)[row] : undefined
  }

  textAt(row: number): string {
    return ((this.lineAt(row) as Line | undefined) ?? []).map((s) => s.t).join('')
  }

  /** A place to redraw from later (the menu); lost if the screen is cleared or reflowed. */
  mark(): object {
    return this.last
  }

  /** Drop everything from `mark` down, so a block can be redrawn in place. False if the mark is gone. */
  rewind(mark: object): boolean {
    const at = this.lines.indexOf(mark as Line)
    if (at < 0) return false
    this.lines.length = at
    this.lines.push([])
    this.touch()
    return true
  }

  /** Mark the current line as where a prompt and its input begin. */
  startInput() {
    this.inputAt = this.last
  }

  /**
   * Redraw the prompt and input from the marked line down, so input longer than
   * the screen continues on the next line(s) and shrinks back on backspace.
   * Hard-wraps at the column, like a tty line editor.
   */
  setInput(segs: Array<[string, Style?]>) {
    let at = this.inputAt ? this.lines.indexOf(this.inputAt) : -1
    if (at < 0) at = this.lines.length - 1
    this.lines.length = at
    this.lines.push([])
    this.inputAt = this.last
    this.hard = true
    for (const [t, s] of segs) this.write(t, s ?? Style.Normal)
    this.hard = false
    this.touch()
  }

  backspace() {
    const line = this.last
    const tail = line[line.length - 1]
    if (!tail) return
    tail.t = tail.t.slice(0, -1)
    if (!tail.t) line.pop()
    this.touch()
  }

  clear() {
    this.lines = [[]]
    this.touch()
  }

  /** Replace the whole screen with ready-made rows (a game frame); no wrapping. */
  blit(rows: Array<Array<[string, Style?]>>) {
    this.lines = rows.map((r) => r.map(([t, s]) => ({ t, s: s ?? Style.Normal })))
    this.inputAt = null
    this.touch()
  }

  /**
   * Redraw if needed. Instead of clearing, the previous frame is darkened, so
   * text that disappears decays over a few frames like phosphor persistence.
   * Returns whether the canvas changed (and so needs re-uploading).
   */
  draw(cursorPhase: boolean, now: number): boolean {
    // Persistence is time-based so it looks the same at any frame rate:
    // roughly 65% of the old image fades every 16ms, gone within ~120ms.
    const dt = Math.min(100, now - this.lastDraw)
    const sinceChange = now - this.changedAt
    if (!this.dirty && sinceChange > 160) return false
    this.lastDraw = now
    const { ctx, canvas } = this
    if (sinceChange > 120) {
      // 8-bit alpha blending never quite reaches zero; finish with a hard clear.
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else {
      ctx.fillStyle = `rgba(0,0,0,${1 - Math.pow(0.35, dt / 16.7)})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    this.dirty = false

    ctx.font = `${this.fontPx}px ${this.font}`
    ctx.textBaseline = 'alphabetic'
    const baseline = Math.round(this.cellH * 0.8)
    const visible = this.lines.slice(-this.rows)

    visible.forEach((line, row) => {
      const y = this.padY + row * this.cellH
      let col = 0
      for (const seg of line) {
        let run = ''
        let runStart = col
        const flush = () => {
          if (!run) return
          const x = this.padX + runStart * this.cellW
          if (seg.s === Style.Inverse) {
            ctx.fillStyle = LEVEL[Style.Inverse]
            ctx.fillRect(x, y, run.length * this.cellW, this.cellH)
            ctx.fillStyle = '#000'
          } else ctx.fillStyle = LEVEL[seg.s]
          ctx.fillText(run, x, y + baseline)
          run = ''
        }
        for (const ch of seg.t) {
          if (CUSTOM.has(ch) || isHalves(ch)) {
            flush()
            this.glyph(ch, this.padX + col * this.cellW, y, LEVEL[seg.s])
            col++
            runStart = col
          } else {
            if (!run) runStart = col
            run += ch
            col++
          }
        }
        flush()
      }
    })

    if (this.cursor && cursorPhase) {
      const row = visible.length - 1
      let col = this.lineLength()
      let r = row
      if (col >= this.cols) {
        col = 0
        r = Math.min(row + 1, this.rows - 1)
      }
      ctx.fillStyle = LEVEL[Style.Normal]
      const x = this.padX + col * this.cellW
      const y = this.padY + r * this.cellH
      // Underline-height block cursor, like a VT220.
      ctx.fillRect(x, y + this.cellH * 0.12, this.cellW, this.cellH * 0.78)
    }
    return true
  }

  private glyph(ch: string, x: number, y: number, color: string) {
    const ctx = this.ctx
    const w = this.cellW
    const h = this.cellH
    // Overdraw by half a pixel so adjacent cells fuse without seams.
    const x0 = Math.floor(x)
    const x1 = Math.ceil(x + w)
    const y0 = y
    const y1 = y + h
    ctx.save()
    ctx.fillStyle = color
    if (isHalves(ch)) {
      const code = ch.charCodeAt(0) - 0xe100
      const top = Math.floor(code / 5)
      const bottom = code % 5
      const mid = Math.round(y0 + h / 2)
      if (top) (ctx.globalAlpha = SHADE_LEVELS[top - 1]), ctx.fillRect(x0, y0, x1 - x0, mid - y0)
      if (bottom) (ctx.globalAlpha = SHADE_LEVELS[bottom - 1]), ctx.fillRect(x0, mid, x1 - x0, y1 - mid)
    } else if (ch in SHADE) {
      ctx.globalAlpha = SHADE[ch]
      ctx.fillRect(x0, y0, x1 - x0, h)
    } else if (ch === '▀') ctx.fillRect(x0, y0, x1 - x0, h / 2)
    else if (ch === '▄') ctx.fillRect(x0, y0 + h / 2, x1 - x0, h / 2)
    else if (ch === '▌') ctx.fillRect(x0, y0, (x1 - x0) / 2, h)
    else if (ch === '▐') ctx.fillRect(x0 + w / 2, y0, (x1 - x0) / 2, h)
    else if ('◢◣◤◥'.includes(ch)) {
      ctx.beginPath()
      if (ch === '◢') ctx.moveTo(x1, y0), ctx.lineTo(x1, y1), ctx.lineTo(x0, y1)
      if (ch === '◣') ctx.moveTo(x0, y0), ctx.lineTo(x1, y1), ctx.lineTo(x0, y1)
      if (ch === '◤') ctx.moveTo(x0, y0), ctx.lineTo(x1, y0), ctx.lineTo(x0, y1)
      if (ch === '◥') ctx.moveTo(x0, y0), ctx.lineTo(x1, y0), ctx.lineTo(x1, y1)
      ctx.closePath()
      ctx.fill()
    } else this.box(ch, x0, y0, x1 - x0, h)
    ctx.restore()
  }

  private box(ch: string, x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    const t = Math.max(1, Math.round(this.fontPx / 14)) // stroke weight
    const cx = Math.round(x + w / 2 - t / 2)
    const cy = Math.round(y + h / 2 - t / 2)
    const gap = t * 2 // spacing between double lines
    const H = (yy: number, from: number, to: number) => ctx.fillRect(from, yy, to - from, t)
    const V = (xx: number, from: number, to: number) => ctx.fillRect(xx, from, t, to - from)
    const L = x
    const R = x + w
    const T = y
    const B = y + h
    switch (ch) {
      case '─':
        H(cy, L, R)
        break
      case '│':
        V(cx, T, B)
        break
      case '┌':
        H(cy, cx, R), V(cx, cy, B)
        break
      case '┐':
        H(cy, L, cx + t), V(cx, cy, B)
        break
      case '└':
        H(cy, cx, R), V(cx, T, cy + t)
        break
      case '┘':
        H(cy, L, cx + t), V(cx, T, cy + t)
        break
      case '├':
        V(cx, T, B), H(cy, cx, R)
        break
      case '┤':
        V(cx, T, B), H(cy, L, cx)
        break
      case '┬':
        H(cy, L, R), V(cx, cy, B)
        break
      case '┴':
        H(cy, L, R), V(cx, T, cy)
        break
      case '┼':
        H(cy, L, R), V(cx, T, B)
        break
      case '═':
        H(cy - gap / 2, L, R), H(cy + gap / 2, L, R)
        break
      case '║':
        V(cx - gap / 2, T, B), V(cx + gap / 2, T, B)
        break
      case '╔':
        H(cy - gap / 2, cx - gap / 2, R), V(cx - gap / 2, cy - gap / 2, B)
        H(cy + gap / 2, cx + gap / 2, R), V(cx + gap / 2, cy + gap / 2, B)
        break
      case '╗':
        H(cy - gap / 2, L, cx + gap / 2 + t), V(cx + gap / 2, cy - gap / 2, B)
        H(cy + gap / 2, L, cx - gap / 2 + t), V(cx - gap / 2, cy + gap / 2, B)
        break
      case '╚':
        H(cy + gap / 2, cx - gap / 2, R), V(cx - gap / 2, T, cy + gap / 2 + t)
        H(cy - gap / 2, cx + gap / 2, R), V(cx + gap / 2, T, cy - gap / 2 + t)
        break
      case '╝':
        H(cy + gap / 2, L, cx + gap / 2 + t), V(cx + gap / 2, T, cy + gap / 2 + t)
        H(cy - gap / 2, L, cx - gap / 2 + t), V(cx - gap / 2, T, cy - gap / 2 + t)
        break
    }
  }
}
