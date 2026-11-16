import '@fontsource/vt323'
import './terminal.css'
import { Screen, Style } from './screen'
import { CRT, type CRTState, warp } from './crt'
import { Sound } from './audio'
import { diamond, LISBON_COMPACT, LISBON_WIDE, pixelWord, shadowWord, TITLE_NARROW, TITLE_WIDE, WORDMARK_NARROW, WORDMARK_WIDE } from './logo'
import { EVENT, LINKS } from './event'
import { type Env, type Game, GAMES, Grid, LISTED } from './games'
import { hasJoined, submitWaitlist } from './waitlist'
import {
  backgroundNames,
  backgroundsFrame,
  backgroundsOnLisbon,
  backgroundsReset,
  backgroundsSetGlow,
  currentBackground,
  initBackgrounds,
  setBackground,
  showToast,
  switchBackground,
} from './backgrounds'
import { currentSkin, initSkins, setSkin, skinNames, switchSkin } from './skins'

// ---------------------------------------------------------------------------
// Setup

const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!
const tube = $<HTMLDivElement>('#tube')
const canvas = $<HTMLCanvasElement>('#crt')
const kbd = $<HTMLInputElement>('#kbd')
const powerBtn = $<HTMLButtonElement>('#power')
const skipBtn = $<HTMLButtonElement>('#skip')
const soundBtn = $<HTMLButtonElement>('#sound')

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const coarse = matchMedia('(pointer: coarse)').matches
// Phones: bigger type on touch (the menu's gap rows make each tap target two
// rows, ≥ 44 px) and a flatter tube on narrow screens (crt.ts tubeShape).
const GLYPH_MIN = coarse ? 22 : 17
const narrow = matchMedia('(max-width: 640px)')

const screen = new Screen()
// Dev only (stripped from builds): inspect the text grid from the console.
if (import.meta.env.DEV) Object.assign(window, { __screen: screen })
const crt = new CRT(canvas, reduced)
if (coarse) $('#standby').textContent = 'tap the screen to power on'
const sound = new Sound()

const PHOSPHOR = {
  green: [0.26, 1.0, 0.45],
  amber: [1.0, 0.6, 0.1],
  white: [0.8, 0.88, 1.0],
} satisfies Record<string, CRTState['tint']>

/** The phosphor colour now (the one whose tint the tube has). */
const currentColor = () =>
  (Object.keys(PHOSPHOR) as Array<keyof typeof PHOSPHOR>).find((c) => PHOSPHOR[c].every((v, i) => v === crtState.tint[i])) ?? 'green'

/** The phosphor colour, remembered like the sound setting. */
function setColor(c: keyof typeof PHOSPHOR) {
  crtState.tint = [...PHOSPHOR[c]]
  try {
    localStorage.setItem('devcon-tty-color', c)
  } catch {}
}

const crtState: CRTState = {
  bright: 0,
  squashX: 1,
  squashY: 1,
  flash: 0,
  wobble: 0,
  on: 0,
  tint: [...PHOSPHOR.green],
}

if (!crt.ok) {
  // No WebGL: show the flat canvas with a CSS approximation.
  tube.classList.add('no-gl')
  canvas.replaceWith(screen.canvas)
}

let pxScale = 1
// Whether the tube has a size yet: a 0×0 tube (mid-layout, or a skin's case
// that doesn't fit) is never drawn, and the canvases never go below 1×1.
let sized = false
function resize() {
  const r = tube.getBoundingClientRect()
  sized = r.width >= 1 && r.height >= 1
  const dpr = Math.min(devicePixelRatio || 1, 2)
  // Cap the pixel budget: the shader takes ~25 texture taps per pixel.
  const budget = coarse ? 1.3e6 : 2.8e6
  pxScale = Math.min(dpr, Math.sqrt(budget / Math.max(1, r.width * r.height)))
  const w = Math.max(1, Math.round(r.width * pxScale))
  const h = Math.max(1, Math.round(r.height * pxScale))
  canvas.width = w
  canvas.height = h
  crt.flat = narrow.matches
  screen.layout(w, h, pxScale, GLYPH_MIN, crt.flat)
  if (mode === 'menu') list === 'past' ? pastList() : endScreen()
  if (mode === 'start') drawStart()
  crt.radius = parseFloat(getComputedStyle(tube).borderTopLeftRadius) * pxScale
  if (!crt.ok) {
    screen.canvas.style.width = '100%'
    screen.canvas.style.height = '100%'
  }
}

// ---------------------------------------------------------------------------
// Tweens + frame loop

type Tween = { obj: Record<string, number>; key: string; from: number; to: number; t0: number; ms: number; ease: (x: number) => number; done: () => void }
const tweens = new Set<Tween>()
const easeOut = (x: number) => 1 - (1 - x) ** 3
const easeIn = (x: number) => x * x * x

/** End every running tween where it is (a power transition takes over the tube). */
function stopTweens() {
  for (const t of [...tweens]) {
    tweens.delete(t)
    t.done()
  }
}

function tween<T extends object>(obj: T, key: keyof T & string, to: number, ms: number, ease = easeOut) {
  return new Promise<void>((done) => {
    const o = obj as unknown as Record<string, number>
    for (const t of tweens) if (t.obj === o && t.key === key) tweens.delete(t)
    tweens.add({ obj: o, key, from: o[key], to, t0: performance.now(), ms, ease, done })
  })
}

let blink = true
let lastBlink = 0
// Idle throttle: after 20 s with no input and no text changes the shader runs
// at ~10 fps; any key, pointer or text change brings back the full rate.
const IDLE_AFTER = 20_000
const IDLE_FRAME = 100
let lastInput = 0
let lastRender = 0
for (const type of ['keydown', 'pointerdown', 'pointermove']) addEventListener(type, () => (lastInput = performance.now()), { passive: true })

function frame(now: number) {
  syncSkip()
  for (const t of tweens) {
    const x = Math.min(1, (now - t.t0) / t.ms)
    t.obj[t.key] = t.from + (t.to - t.from) * t.ease(x)
    if (x >= 1) {
      tweens.delete(t)
      t.done()
    }
  }
  if (now - lastBlink > 530) {
    blink = !blink
    lastBlink = now
    if (screen.cursor) screen.touch(false)
  }
  const idle = now - Math.max(lastInput, screen.editedAt) > IDLE_AFTER && tweens.size === 0
  if (idle && now - lastRender < IDLE_FRAME) {
    requestAnimationFrame(frame)
    return
  }
  lastRender = now
  if (!sized) {
    requestAnimationFrame(frame)
    return
  }
  backgroundsFrame(now)
  const changed = screen.draw(blink, now)
  if (crt.ok) {
    if (changed) crt.upload(screen.canvas)
    crt.render(now / 1000, crtState, pxScale)
  }
  requestAnimationFrame(frame)
}

// ---------------------------------------------------------------------------
// Script timing: everything awaits `wait`, so the whole boot can be
// fast-forwarded (Esc) or cancelled (reboot/power off) from one place.

/**
 * Boot durations in real milliseconds at normal speed (~10 s from power-on to
 * the reveal). Reduced motion divides everything by `speed`. [min, max] pairs
 * are random ranges. Progress bars average their value (plus a stall where
 * noted); spinners run for theirs.
 */
const TIMING = {
  // CRT power-on: the beam opening is awaited, the rest overlaps the BIOS.
  beam: 420,
  flash: 700,
  wobble: 1500,
  warmUp: 3000,
  // BIOS
  biosStart: 150,
  biosLine: 150,
  memStep: 20, // ×17 steps of 4096K
  drives: [324, 191, 235, 147], // primary master/slave, secondary master/slave
  setupPrompt: 250,
  afterBeep: 200,
  afterClear: 100,
  bootDisk: 200,
  // Kernel
  lilo: 250,
  loadingDot: 25, // ×14
  uncompress: 200,
  kernelLine: [25, 60],
  beforeInit: 120,
  initLine: 100,
  initTimezone: 150,
  initRootFs: 300,
  initVenue: 200,
  initPeers: 150,
  runlevel: 150,
  // Login
  loginPrompt: 80,
  typeChar: [25, 55],
  typeHesitate: [60, 140], // occasional, 8% of keys
  loggingIn: 150,
  // devcon run
  commandPrompt: 120,
  commandEnter: 80,
  runStart: 100,
  runtime: 250,
  peers: 1200,
  historyRow: 100,
  pending: 1000,
  ready: 100,
  beforeReveal: 200,
  // Lisbon reveal (~4.5 s): drawing, name, local colour, when and where.
  lisbonClear: 300,
  artFrame: 12, // ×4 scramble frames per drawing row
  artRow: 30,
  beforeName: 250,
  nameRow: 45,
  afterName: 350,
  lisbonLine: 400,
  // The finished reveal stays up this long (any key moves on).
  revealHold: 4000,
  revealHoldReduced: 2000, // real ms, not divided by speed
  // Spinner frame rate (boot and waitlist).
  spinFrame: 53,
} as const
const T = TIMING

const ABORT = Symbol('abort')
let generation = 0
let skipping = false
// Every wait is real ms at normal speed; reduced motion runs the script faster.
const speed = reduced ? 2.5 : 1
const sleepers = new Set<() => void>()

function wait(ms: number) {
  const gen = generation
  // Fast-forwarding: no timer at all, so a skipped stretch completes at once
  // rather than at the browser's minimum timer interval per step.
  if (skipping) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const finish = () => {
      sleepers.delete(finish)
      clearTimeout(id)
      gen === generation ? resolve() : reject(ABORT)
    }
    const id = setTimeout(finish, skipping ? 0 : ms / speed)
    sleepers.add(finish)
  })
}

function wakeAll() {
  for (const s of [...sleepers]) s()
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

// ---------------------------------------------------------------------------
// Output helpers

const W = () => screen.cols
const out = (text = '', style = Style.Normal) => screen.writeln(text, style)

async function lines(list: string[], min = 30, max = 90, style = Style.Normal) {
  for (const l of list) {
    out(l, style)
    await wait(rand(min, max))
  }
}

/** Human typing, with keyclicks and the odd hesitation. */
async function type(text: string, style = Style.Bright, echo = true) {
  for (const ch of text) {
    if (echo) screen.write(ch, style)
    else screen.touch()
    sound.key()
    await wait(rand(...T.typeChar) + (Math.random() < 0.08 ? rand(...T.typeHesitate) : 0))
  }
}

// The machine's name: anonymous through the boot so nothing gives the city
// away, then the city once the title card has revealed it.
let host = 'devcon'
// The working directory: home, or the games directory (`cd games`).
type Dir = '~' | '~/games' | '/usr/games'
let cwd: Dir = '~' as Dir
const inGames = () => cwd !== '~'
const promptRow = (): Array<[string, Style?]> => [[`guest@${host}`, Style.Bright], [`:${cwd}$ `]]

/** "label ....... [  OK  ]" with the status flush right, sysvinit style. */
async function status(label: string, ms: number, result = 'OK', style = Style.Bright, seeks = 4) {
  screen.write(label)
  if (ms >= 250 && seeks) sound.seek(seeks, ms / 1000)
  await wait(ms)
  endStatus(label, result, style)
}

/** Finish a status row: dots out to the tag flush right, init-style ("[  OK  ]", "[FAILED]"). */
function endStatus(label: string, result: string, style = Style.Bright) {
  // Results are centred in six columns, so every tag is eight wide.
  const left = ' '.repeat(Math.max(0, Math.floor((6 - result.length) / 2)))
  const right = ' '.repeat(Math.max(0, 6 - result.length - left.length))
  // Brackets plain; a dim result (FAILED) dims them too, so OK stands out.
  const bracket = style === Style.Dim ? Style.Dim : Style.Normal
  const tag: Array<[string, Style?]> = [[`[${left}`, bracket], [result, style], [`${right}]`, bracket]]
  const tagLen = left.length + result.length + right.length + 2
  const room = W() - label.length - tagLen
  if (room >= 3) {
    screen.setLine([[label], [' ' + '.'.repeat(room - 2) + ' ', Style.Dim], ...tag])
  } else {
    // Too long to share a row on a narrow screen: the tag goes flush right
    // underneath rather than being wrapped apart.
    screen.newline()
    screen.setLine([[' '.repeat(W() - tagLen)], ...tag])
  }
  screen.newline()
}

/** A progress bar that doesn't progress evenly — real ones never did. */
async function progress(label: string, ms: number, opts: { stallAt?: number; suffix?: (f: number) => string } = {}) {
  const width = Math.max(10, Math.min(28, W() - label.length - 14))
  const steps = 40
  for (let i = 0; i <= steps; i++) {
    const f = i / steps
    const filled = Math.round(f * width)
    const pct = `${Math.round(f * 100)}`.padStart(3)
    screen.setLine([[label + ' ['], ['#'.repeat(filled), Style.Bright], ['.'.repeat(width - filled), Style.Dim], [`] ${pct}%`], [opts.suffix?.(f) ?? '', Style.Dim]])
    // Uneven steps that average out to `ms`.
    let d = (ms / steps) * (rand(0.2, 2.2) / 1.2)
    if (opts.stallAt && Math.abs(f - opts.stallAt) < 0.001) d += ms * 0.45
    if (Math.random() < 0.3) sound.seek(1, 0.05)
    await wait(d)
  }
  screen.newline()
}

async function spin(label: string, ms: number, done = 'done') {
  const frames = '|/-\\'
  const t0 = performance.now()
  let i = 0
  while (performance.now() - t0 < ms / speed && !skipping) {
    screen.setLine([[label + ' '], [frames[i++ % 4], Style.Bright]])
    await wait(T.spinFrame)
  }
  screen.setLine([[label + ' '], [done, Style.Bright]])
  screen.newline()
}

/** A spinner that turns until `task` settles; `done` picks the closing word. */
async function spinUntil<T>(label: string, task: Promise<T>, done: (r: T) => string): Promise<T> {
  const frames = '|/-\\'
  let settled: { r: T } | undefined
  void task.then((r) => (settled = { r }))
  let i = 0
  while (!settled) {
    screen.setLine([[label + ' '], [frames[i++ % 4], Style.Bright]])
    await wait(T.spinFrame)
  }
  screen.setLine([[label + ' '], [done(settled.r), Style.Bright]])
  screen.newline()
  return settled.r
}

// ---------------------------------------------------------------------------
// Boot sequence

async function bios() {
  performance.mark('boot:bios')
  await wait(T.biosStart)
  out('Devcon Modular BIOS v9.27', Style.Bright)
  out('Copyright (C) 2014-2027, Ethereum Foundation')
  out()
  await wait(T.biosLine)
  out('DEVCON-486DX2 CPU at 66MHz')
  await wait(T.biosLine)
  for (let k = 0; k <= 65536; k += 4096) {
    screen.setLine([['Memory Test :  '], [`${k}K`, Style.Bright]])
    await wait(T.memStep)
  }
  screen.setLine([['Memory Test :  '], ['65536K OK', Style.Bright]])
  screen.newline()
  out()
  await wait(T.biosLine)
  const drives: Array<[string, string, number]> = [
    ['Detecting IDE Primary Master  ', 'DEVCON-IX 2027MB', T.drives[0]],
    ['Detecting IDE Primary Slave   ', 'None', T.drives[1]],
    ['Detecting IDE Secondary Master', 'CD-ROM 4X', T.drives[2]],
    ['Detecting IDE Secondary Slave ', 'None', T.drives[3]],
  ]
  for (const [label, found, ms] of drives) {
    screen.write(label + ' ... ')
    sound.seek(3, ms / 1000)
    await wait(ms)
    screen.write(found, found === 'None' ? Style.Dim : Style.Bright)
    screen.newline()
  }
  out()
  out('Press DEL to enter SETUP', Style.Dim)
  await wait(T.setupPrompt)
  sound.beep()
  await wait(T.afterBeep)
  screen.clear()
  await wait(T.afterClear)
  out('Boot from Hard Disk...')
  sound.seek(6, T.bootDisk / 1000)
  await wait(T.bootDisk)
}

async function kernel() {
  performance.mark('boot:kernel')
  out()
  screen.write('LILO boot: ')
  await wait(T.lilo)
  screen.newline()
  screen.write('Loading linux')
  for (let i = 0; i < 14; i++) {
    screen.write('.')
    if (i % 3 === 0) sound.seek(2, 0.15)
    await wait(T.loadingDot)
  }
  screen.newline()
  out('Uncompressing Linux... Ok, booting the kernel.')
  await wait(T.uncompress)
  sound.seek(6, 0.4)
  await lines(
    [
      'Linux version 2.0.36 (root@devcon) #9 Tue Oct 12 1999',
      'Memory: 63284k/65536k available (624k kernel code)',
      'eth0: NE2000 found at 0x300, IRQ 9',
      'hda: DEVCON-IX, 2027MB w/128kB Cache, CHS=1027/64/63',
      'VFS: Mounted root (ext2 filesystem) readonly.',
    ],
    ...T.kernelLine,
  )
  await wait(T.beforeInit)
  performance.mark('boot:init')
  out('INIT: version 2.74 booting')
  await wait(T.initLine)
  await status('Setting timezone: [redacted]', T.initTimezone)
  await status('Checking root filesystem', T.initRootFs)
  await status('Mounting /dev/venue on /venue', T.initVenue)
  await status('Starting peer discovery', T.initPeers)
  out('INIT: Entering runlevel: 3')
  await wait(T.runlevel)
}

// Local colour, held back from the boot because it gives the city away; shown
// as init steps at the Lisbon reveal.
const LOCAL_STATUS = ['Grilling sardines', 'Warming pastéis de nata']

// The search for the next venue, just before the reveal: red herrings that
// fail fast, then the real city, whose dots fill in slowly. Edit freely.
const CITY_SEARCH = {
  misses: ['Madrid', 'Sydney', 'Rio de Janeiro', 'Kigali', 'Johannesburg', 'Nairobi'],
  miss: [300, 350] as [number, number], // ms per failing row
  found: 1500, // ms for the real city's dots
}

// Whether Esc was pressed before the city search: then the reveal is skipped
// outright; Esc during the search or the reveal only hurries it to the hold.
let skippedEarly = false

async function citySearch() {
  skippedEarly = skipping
  out('devcon: locating next venue')
  for (const city of CITY_SEARCH.misses) {
    sound.seek(1, 0.05)
    await status(city, rand(...CITY_SEARCH.miss), 'FAILED', Style.Dim, 0)
  }
  // The real one: the dots creep out, then the tag lands.
  const label = EVENT.city
  const room = W() - label.length - 8
  const dots = room >= 3 ? room - 2 : 0
  screen.write(label + ' ')
  for (let i = 0; i < dots; i++) {
    screen.write('.', Style.Dim)
    if (i % 4 === 0) sound.seek(1, 0.05)
    await wait(CITY_SEARCH.found / Math.max(1, dots))
  }
  if (!dots) await wait(CITY_SEARCH.found)
  endStatus(label, 'OK')
  sound.beep()
  setTitle(PAGE_TITLE)
  // The backdrop's light warms here.
  document.body.dataset.found = '1'
  backgroundsOnLisbon()
}

async function login() {
  performance.mark('boot:login')
  out()
  out('Devcon/Linux 9.0 (devcon) (tty1)')
  out()
  screen.write('devcon login: ')
  await wait(T.loginPrompt)
  await type('guest', Style.Normal)
  screen.newline()
  screen.write('Password: ')
  await wait(T.loginPrompt)
  await type('********', Style.Normal, false)
  screen.newline()
  await wait(T.loggingIn)
  out('Last login: Fri Nov 15 18:02:11 2024 from bangkok')
  out('You have new mail.')
  out()
}

// Opening morning, for the `mail` header and `.plan`.
const START = new Date(`${EVENT.startISO}T09:00:00Z`)
const startPart = (o: Intl.DateTimeFormatOptions) => START.toLocaleString('en-US', { timeZone: 'UTC', ...o })
// Lowercase ASCII city and the year, for the history rows ("lisbon  2027").
const CITY_ID = EVENT.city.normalize('NFD').replace(/[^\x20-\x7e]/g, '').toLowerCase()
const YEAR = EVENT.startISO.slice(0, 4)

const SOURCE = [
  '/* devcon.c -- the ninth one */',
  '#include <stdio.h>',
  '#include "ethereum.h"',
  '',
  'int main(void)',
  '{',
  '    struct gathering ix = {',
  `        .name  = "${EVENT.name}",`,
  `        .city  = "${EVENT.city}, ${EVENT.country}",`,
  `        .venue = "${EVENT.venue}",`,
  `        .from  = "${EVENT.startISO}",`,
  `        .to    = "${EVENT.endISO}",`,
  '    };',
  '',
  '    return convene(&ix);',
  '}',
]

interface Edition {
  id: string // lowercase ASCII, for the boot replay
  name: string
  year: string
  hook: string
  archive: string | null // its talks on the archive; null until they're up
}

/** An edition's talks: the archive's per-event filter (devcon-0 … devcon-7, then devcon8 and up). */
const talks = (n: number) => `${LINKS.archive}watch/?event=${n >= 8 ? `devcon${n}` : `devcon-${n}`}`

// Every Devcon so far, with a one-line hook for `history -v` and the
// screen-reader list. Devcon IX itself comes from EVENT.
const HISTORY: Edition[] = [
  { id: 'berlin', name: 'Berlin', year: '2014', hook: 'Kreuzberg meetup named ÐΞVcon-0, before Ethereum launched', archive: talks(0) },
  { id: 'london', name: 'London', year: '2015', hook: 'months after mainnet; the original roadmap on stage', archive: talks(1) },
  { id: 'shanghai', name: 'Shanghai', year: '2016', hook: 'DoS attacks hit hours before; fixes coordinated backstage', archive: talks(2) },
  { id: 'cancun', name: 'Cancún', year: '2017', hook: 'held around Día de los Muertos; just under 2,000 people', archive: talks(3) },
  { id: 'prague', name: 'Prague', year: '2018', hook: 'about 3,000 attendees, back in Europe', archive: talks(4) },
  { id: 'osaka', name: 'Osaka', year: '2019', hook: 'first community outdoor stage; Kabosu visited', archive: talks(5) },
  { id: 'bogota', name: 'Bogotá', year: '2022', hook: 'first after the pandemic pause', archive: talks(6) },
  { id: 'bangkok', name: 'Bangkok', year: '2024', hook: '12,500 attendees from 135 countries', archive: talks(7) },
  { id: 'mumbai', name: 'Mumbai', year: '2026', hook: 'four days at Jio World Centre', archive: talks(8) },
]

// Devconnect, for `history --all`: each listed after the Devcon it followed.
const DEVCONNECT: Array<{ name: string; year: string; after: number }> = [
  { name: 'Devconnect Amsterdam', year: '2022', after: 5 },
  { name: 'Devconnect Istanbul', year: '2023', after: 6 },
  { name: 'Devconnect Buenos Aires', year: '2025', after: 7 },
]

// VT323 has no Greek: the terminal spells the first edition's name plainly.
const ttyText = (s: string) => s.replace('ÐΞVcon', 'DEVcon')

async function run() {
  performance.mark('boot:run')
  for (const [t, s] of promptRow()) screen.write(t, s)
  await wait(T.commandPrompt)
  await type('./devcon')
  await wait(T.commandEnter)
  screen.newline()
  out('devcon: version IX')
  await wait(T.runStart)
  await spin('devcon: loading runtime', T.runtime, 'ok')
  let peers = 0
  await progress('devcon: finding peers', T.peers, {
    suffix: (f) => {
      peers = Math.max(peers, Math.round(f ** 1.6 * 3141 + Math.random() * 40))
      return `  ${peers.toLocaleString('en-US')}`
    },
  })
  out('devcon: replaying history')
  for (let i = 0; i < HISTORY.length; i++) {
    const { id: city, year } = HISTORY[i]
    screen.setLine([[`  #${i}  `, Style.Dim], [city.padEnd(10)], [year + '  ', Style.Dim], ['ok', Style.Bright]])
    screen.newline()
    sound.seek(2, 0.1)
    await wait(T.historyRow * rand(0.8, 1.2))
  }
  // The ninth city stays a secret until the title card.
  screen.setLine([['  #9  ', Style.Dim], ['??????'.padEnd(10), Style.Bright], [YEAR + '  ', Style.Dim]])
  await spin(screen.lines[screen.lines.length - 1].map((s) => s.t).join(''), T.pending, 'pending')
  await citySearch()
  await wait(T.ready)
  out('devcon: ready.', Style.Bright)
  await wait(T.beforeReveal)
}

// ---------------------------------------------------------------------------
// Title card

type Row = Array<[string, Style?]>

/** ANSI Shadow wordmark: solid strokes bright, the box-drawn shadow dim. */
function shaded(line: string, prefix = ''): Row {
  const row: Row = prefix ? [[prefix]] : []
  for (const ch of line) {
    const style = ch === '█' ? Style.Bright : Style.Dim
    const tail = row[row.length - 1]
    if (tail && tail[1] === style) tail[0] += ch
    else row.push([ch, style])
  }
  return row
}

function card(): { logo: Row[]; info: Row[] } {
  const aspect = screen.cellH / screen.cellW
  const cols = W()
  const info: Row[] = [
    [[`${EVENT.name} ${EVENT.city}`, Style.Bright]],
    [],
    [['where  ', Style.Dim], [EVENT.venue]],
    [['       '], [`${EVENT.city}, ${EVENT.country}`]],
    [['when   ', Style.Dim], [EVENT.dateRange]],
  ]

  if (cols >= 76) {
    // Diamond on the left, wordmark + details on the right (neofetch-style).
    const gem = diamond(13, aspect)
    const gemW = Math.max(...gem.map((l) => l.length))
    const left = Math.max(1, Math.floor((cols - (gemW + 4 + WORDMARK_WIDE[0].length)) / 2))
    const gutter = ' '.repeat(left)
    const right: Row[] = [[], ...WORDMARK_WIDE.map((l) => shaded(l)), [], ...info]
    const logo: Row[] = []
    for (let i = 0; i < Math.max(gem.length, right.length); i++) {
      const g = (gem[i] ?? '').padEnd(gemW + 4)
      logo.push([[gutter + g, Style.Bright], ...(right[i] ?? [])])
    }
    return { logo, info: [] }
  }

  const center = (s: string) => ' '.repeat(Math.max(0, Math.floor((cols - s.length) / 2))) + s
  const gemRows = Math.min(20, Math.max(8, screen.rows - 26), Math.floor((cols - 4) / (aspect * 0.62)))
  const gem = diamond(gemRows, aspect)
  const gemW = Math.max(...gem.map((l) => l.length))
  const mark = cols >= WORDMARK_WIDE[0].length + 2 ? WORDMARK_WIDE : WORDMARK_NARROW
  const logo: Row[] = [
    ...gem.map((l): Row => [[center(l.padEnd(gemW)), Style.Bright]]),
    [],
    ...mark.map((l) => shaded(center(l))),
    [],
  ]
  const pad = ' '.repeat(Math.max(1, Math.floor((cols - 35) / 2)))
  return { logo, info: info.map((r): Row => (r.length ? [[pad], ...r] : r)) }
}

const GLITCH = '░▒▓█<>/\\|=+*#%$&@'
const scramble = (s: string, keep: number) =>
  [...s].map((ch, i) => (ch === ' ' || i < keep ? ch : GLITCH[(Math.random() * GLITCH.length) | 0])).join('')

/** A row arrives as noise and resolves left to right. */
async function glitchIn(row: Row, frame: number, settle: number) {
  const text = row.map(([t]) => t).join('')
  for (let k = 0; k <= 3; k++) {
    screen.setLine([[scramble(text, Math.floor((text.length * k) / 3)), Style.Dim]])
    await wait(frame)
  }
  screen.setLine(row)
  screen.newline()
  await wait(settle)
}

/** A drawing row after `pad` spaces: ░ dim, blocks normal, line work bright (all dim for water). */
function artRow(line: string, pad: number, water: boolean): Row {
  const row: Row = [[' '.repeat(pad), Style.Normal]]
  for (const ch of line) {
    const style = water || ch === '░' ? Style.Dim : '▄▀█▌▐'.includes(ch) ? Style.Normal : Style.Bright
    const tail = row[row.length - 1]
    if (tail[1] === style || ch === ' ') tail[0] += ch
    else row.push([ch, style])
  }
  return row
}

/**
 * Where it is, at last: the bridge drawn in, the city's name lands (with the
 * beep and the full tab title), then local colour, when and where. Picks the
 * drawing and lettering that fit the grid without scrolling.
 */
async function lisbon() {
  performance.mark('boot:lisbon')
  // Esc before the reveal skips it altogether; Esc during it only hurries it.
  const skipped = skippedEarly
  screen.clear()
  screen.cursor = false
  await wait(T.lisbonClear)
  const cols = W()
  const lines = 5 // country, two local status rows, when, where
  // As on the end screen, room() leaves the bottom row for the cursor line, so
  // a reveal that exactly fills the screen doesn't push its top row off.
  const art = cols >= 76 && room() >= LISBON_WIDE.rows.length + 6 + lines ? LISBON_WIDE : LISBON_COMPACT
  const city = EVENT.city.toUpperCase()
  const big = cols >= 76 ? shadowWord(city) : pixelWord(city)
  const fits = big.length <= room() - art.rows.length - lines && Math.max(...big.map((l) => l.length)) <= cols
  const centre = (w: number) => Math.max(0, Math.floor((cols - w) / 2))
  const name = fits ? big : [city]
  const top = Math.max(0, Math.floor((room() - (art.rows.length + name.length + lines)) / 2))
  for (let i = 0; i < top; i++) out()

  const artPad = centre(Math.max(...art.rows.map((l) => l.length)))
  for (const [i, line] of art.rows.entries()) await glitchIn(artRow(line, artPad, i >= art.water), T.artFrame, T.artRow)
  await wait(T.beforeName)
  const namePad = ' '.repeat(centre(Math.max(...name.map((l) => l.length))))
  for (const line of name) {
    screen.setLine(fits ? shaded(line, namePad) : [[namePad + line, Style.Bright]])
    screen.newline()
    await wait(T.nameRow)
  }
  // The name lands.
  sound.beep()
  out(' '.repeat(centre(EVENT.country.length)) + EVENT.country, Style.Dim)
  await wait(T.afterName)

  for (const label of LOCAL_STATUS) await status(label, T.lisbonLine)
  whenRow()
  await wait(T.lisbonLine)
  whereRow()
  if (!skipped) {
    skipping = false
    sound.quiet = false
  }
  await hold(reduced ? T.revealHoldReduced * speed : T.revealHold)
}

// The finished reveal stays on screen; any key, click or tap moves on.
let holdSkip: (() => void) | null = null

async function hold(ms: number) {
  if (skipping) return
  // The hint goes on the bottom row (the cursor line the fit checks keep free).
  while (screen.lines.length < screen.rows) screen.newline()
  const hint = coarse ? 'tap to continue' : 'press any key to continue'
  screen.setLine([[' '.repeat(centred(hint.length)) + hint, Style.Dim]])
  const timer = wait(ms)
  timer.catch(() => {})
  const pressed = new Promise<void>((resolve) => (holdSkip = resolve))
  mode = 'hold'
  try {
    await Promise.race([timer, pressed])
  } finally {
    holdSkip = null
    if (mode === 'hold') mode = 'boot'
  }
}

/** The reveal's last two lines, which the menu always sits under. */
function whenRow() {
  screen.setLine([['when   ', Style.Dim], [EVENT.dateRange]])
  screen.newline()
}
function whereRow() {
  screen.setLine([['where  ', Style.Dim], [EVENT.venue]])
  screen.newline()
}


// ---------------------------------------------------------------------------
// rm -rf /: the drive is wiped, the kernel panics, the monitor arcs, bangs and
// smokes, then restarts by itself into a BIOS with no OS to boot, falls back
// to the CD-ROM and reinstalls. Fried survives a reload until the reinstall.

const FRIED_KEY = 'devcon-tty-fried'
let fried = false
try {
  fried = localStorage.getItem(FRIED_KEY) === '1'
} catch {}
// The next power-on skips the start screen and boots straight away (after a fry).
let autoBoot = false

function setFried(v: boolean) {
  fried = v
  try {
    if (v) localStorage.setItem(FRIED_KEY, '1')
    else localStorage.removeItem(FRIED_KEY)
  } catch {}
}

/** `rm -rf /` in its common spellings (and `rf`, for fast fingers). */
function isNuke(line: string) {
  const t = line.split(/\s+/).filter(Boolean)
  if (t[0] === 'sudo') t.shift()
  if (t[0] !== 'rm' && t[0] !== 'rf') return false
  let r = false
  let f = false
  let root = false
  for (const a of t.slice(1)) {
    if (a === '--recursive') r = true
    else if (a === '--force') f = true
    else if (a === '--no-preserve-root') continue
    else if (/^-[a-zA-Z]+$/.test(a)) {
      if (/[rR]/.test(a)) r = true
      if (a.includes('f')) f = true
    } else if (/^\/+\*?$/.test(a)) root = true
    else return false
  }
  return r && f && root
}

const OOPS = [
  'Unable to handle kernel paging request at virtual address 0000dead',
  'current->tss.cr3 = 00101000, %cr3 = 00101000',
  '*pde = 00000000',
  'Oops: 0002',
  'CPU:    0',
  'EIP:    0010:[<c0119f2e>]',
  'EFLAGS: 00010286',
  'eax: deadbeef   ebx: 00000000   ecx: 00000001   edx: c01f3fb8',
  'esi: 00000000   edi: 0000002f   ebp: 00000000   esp: c01f3f84',
  'Process init (pid: 1, process nr: 0, stackpage=c01f3000)',
  'Call Trace: [<c0110a2f>] [<c0118b4d>] [<c010a6d4>]',
  'Code: 89 03 8b 44 24 14 85 c0 74 0b 50 e8',
]

const noise = (n: number) => Array.from({ length: n }, () => GLITCH[(Math.random() * GLITCH.length) | 0]).join('')

/** Garble a fraction of the visible characters: the deflection is going. */
function corrupt(p: number) {
  for (const line of screen.lines.slice(-screen.rows))
    for (const seg of line) seg.t = [...seg.t].map((ch) => (Math.random() < p ? noise(1) : ch)).join('')
  screen.touch()
}

async function nuke() {
  setFried(true)
  screen.cursor = false
  // rm is silent while it works; the drive is not.
  for (let i = 0; i < 6; i++) {
    sound.seek(14, 0.35)
    await wait(350)
  }
  // Only /proc fights back.
  const files = ['cmdline', 'environ', 'mem', 'stat', 'status', 'maps', 'fd']
  for (const pid of [1, 2, 3, 4, 5, 63, 71, 84, 97, 112, 126, 140, 141]) {
    for (const f of files.filter(() => Math.random() < 0.45)) {
      out(`rm: cannot unlink \`/proc/${pid}/${f}': Operation not permitted`)
      if (Math.random() < 0.4) sound.seek(2, 0.05)
      await wait(rand(8, 30))
    }
    out(`rm: cannot remove directory \`/proc/${pid}': Operation not permitted`)
    await wait(rand(8, 30))
  }
  out("rm: cannot remove directory `/proc': Operation not permitted")
  await wait(500)
  for (const [t, s] of promptRow()) screen.write(t, s)
  screen.cursor = true
  await wait(1800)
  screen.cursor = false
  screen.newline()
  await lines(OOPS, 15, 50)
  out('Kernel panic: Attempted to kill init!', Style.Bright)
  await wait(2500)
  await fry()
}

async function fry() {
  const gen = generation
  // Arcing: the picture swims, the text breaks up, the buzz climbs.
  const ms = 3000 / speed
  sound.arc(ms / 1000)
  void tween(crtState, 'wobble', 2.4, ms, easeIn)
  const t0 = performance.now()
  for (let x = 0; x < 1; x = (performance.now() - t0) / ms) {
    corrupt(0.01 + 0.2 * x * x)
    if (Math.random() < 0.15 * x) out(noise(W()), Style.Dim)
    // A small brightness sag only: no full-screen strobing.
    if (!reduced) crtState.bright = rand(0.85, 1.1)
    await wait(100)
  }
  // Bang. The raster collapses to a dot that takes its time to fade.
  sound.pop()
  setGlow(false)
  crtState.bright = 1
  crtState.wobble = 0
  crtState.flash = 2
  void tween(crtState, 'squashY', 0.006, 90, easeIn)
  await tween(crtState, 'squashX', 0.006, 140, easeIn)
  if (gen !== generation) return
  await tween(crtState, 'flash', 0, 2600)
  if (gen !== generation) return
  screen.clear()
  crtState.on = 0
  crtState.bright = 0
  crtState.squashX = 1
  crtState.squashY = 1
  crtState.flash = 0
  power = 'off'
  wantOn = false
  mode = 'off'
  setState('off')
  setTitle(SHORT_TITLE)
  delete document.body.dataset.found
  backgroundsReset()
  tube.classList.remove('smoking')
  void tube.offsetWidth
  tube.classList.add('smoking')
  setTimeout(() => tube.classList.remove('smoking'), 9000)
  // Once the smoke clears it tries again by itself (a press gets there sooner).
  autoBoot = true
  await wait(reduced ? 2500 : 6500)
  if (power === 'off') requestPower(true)
}

/** The BIOS hands over to a boot sector whose second stage is gone. */
async function noSystem() {
  screen.write('L')
  await wait(600)
  for (let i = 0; i < 10; i++) {
    screen.write(' 01')
    sound.seek(1, 0.05)
    await wait(rand(90, 200))
  }
  screen.newline()
  await wait(1200)
  out()
  out('DISK BOOT FAILURE', Style.Bright)
  out('No operating system on hda.')
  out()
  await wait(1500)
  out('Boot from CD-ROM...')
  sound.seek(10, 1.2)
  await wait(1800)
}

const PACKAGES: Array<[string, number]> = [
  ['base', 1400],
  ['kernel-2.0.36', 700],
  ['libc5', 600],
  ['sysvinit', 400],
  ['lilo', 300],
  ['bica', 250],
  ['pasteis', 250],
  ['devcon', 500],
]

async function reinstall() {
  screen.clear()
  out('Devcon/Linux 9.0 Setup', Style.Bright)
  out('='.repeat(22), Style.Dim)
  out()
  await status('Probing hardware', 400)
  await status('Partitioning /dev/hda', 500)
  await progress('mke2fs /dev/hda1', 1200)
  out()
  out('Installing packages:')
  for (const [name, ms] of PACKAGES) await progress('  ' + name.padEnd(13), ms)
  out()
  await status('Installing LILO on /dev/hda', 500)
  setFried(false)
  out()
  out('Setup complete. Remove the CD; rebooting.', Style.Bright)
  out('Tip: `rm -i` asks first.', Style.Dim)
  await wait(2200)
  screen.clear()
  sound.beep()
  await wait(300)
}

// ---------------------------------------------------------------------------
// Interaction

type Mode = 'off' | 'start' | 'boot' | 'hold' | 'menu' | 'more' | 'yn' | 'email' | 'shell' | 'busy' | 'game'
let mode: Mode = 'off'
let input = ''
let promptSegs: Row = []
const recall: string[] = []
let recallAt = 0

function setState(s: 'off' | 'booting' | 'on') {
  document.body.dataset.state = s
  powerBtn.setAttribute('aria-pressed', String(s !== 'off'))
}

/** The skip/replay key's job, from the mode: skip the intro, replay it, or nothing (off). */
let skipRole = ''
function syncSkip() {
  const role = power !== 'on' ? 'off'
    : mode === 'start' || mode === 'boot' || mode === 'hold' ? 'skip'
    : 'replay'
  if (role === skipRole) return
  skipRole = role
  const label = role === 'replay' ? 'Replay intro' : 'Skip intro'
  skipBtn.disabled = role === 'off'
  skipBtn.dataset.role = role
  skipBtn.setAttribute('aria-label', label)
  skipBtn.title = label
}

function onSkipKey() {
  // Mid-transition (or off) the key does nothing.
  if (power !== 'on') return
  if (mode === 'start') {
    // The first gesture: the power-on sound plays, then straight to the end.
    void startBoot()
    skip()
  } else if (mode === 'boot') skip()
  else if (mode === 'hold') holdSkip?.()
  else if (mode !== 'off') void replay()
}

function echoInput() {
  const shown = mode === 'yn' ? input.slice(-1) : input
  screen.setInput([...promptSegs, [shown, Style.Bright]])
}

function ask(segs: Row, m: Mode) {
  promptSegs = segs
  input = ''
  mode = m
  screen.cursor = true
  screen.startInput()
  echoInput()
}

// [Y/n] questions: what Enter alone means, and how to ask again after a bad answer.
let ynDefault = true
let askYn = () => {}

// On touch screens the answers are tap targets instead of a key hint.
const YES = '[ yes ]'
const NO = '[ no ]'
const ynChoices = (keys: string): Row => (coarse ? [[YES, Style.Bright], ['  '], [NO, Style.Bright], [' ']] : [[keys, Style.Bright]])

function askWaitlist() {
  ynDefault = true
  askYn = askWaitlist
  ask([['Join the waitlist? '], ...ynChoices('[Y/n] ')], 'yn')
}

/** For someone already on the list: `waitlist --again`, as a question. */
function askAgain() {
  ynDefault = false
  askYn = askAgain
  ask([['Use a different address? '], ...ynChoices('[y/N] ')], 'yn')
}

/** Back to the prompt, or, when the menu is home, to "press any key for the menu". */
function askShell() {
  if (menuHome) return pressForMenu()
  ask(promptRow(), 'shell')
}

/** The email prompt; the privacy line comes once, not again on a retry. */
function askEmail(notice = true) {
  if (notice) out('By joining you agree to the Devcon privacy notice. Type `privacy` to read it.', Style.Dim)
  ask([['Email address: ']], 'email')
}

// ---------------------------------------------------------------------------
// The end screen: a numbered menu under the reveal. Each item runs a shell
// command; afterwards "press any key for the menu" redraws when/where + menu.

// VT323 has no ✓ glyph, so the joined state is spelled out (canvas and HTML menus).
const joinLabel = () => (hasJoined() ? "You're on the list (joined)" : 'Join the waitlist')

const MENU: Array<{ label: () => string; cmd: string; run?: () => void }> = [
  { label: () => joinLabel(), cmd: 'waitlist' },
  { label: () => `About ${EVENT.name}`, cmd: 'about' },
  { label: () => 'Past Devcons', cmd: 'history', run: () => pastList() },
  { label: () => 'Watch the archive', cmd: 'archive' },
  { label: () => display(LINKS.home), cmd: 'devcon.org' },
  { label: () => 'Privacy', cmd: 'privacy' },
  { label: () => 'Code of conduct', cmd: 'coc' },
  { label: () => 'Open the shell', cmd: '' },
]
// Whether commands come back to the menu (via "press any key") or to the prompt.
let menuHome = false
let menuSel = 0
let menuMark: object | null = null
// Typing at the menu opens a prompt under it; Esc there returns to the menu.
let menuInput = false
// Touch puts a blank line between rows (bigger targets) where the screen has
// room for it; a short screen (a phone on its side) keeps them together.
let gaps = coarse

/** The menu box: a frame from 34 columns up, numbered lines below that. */
function menuBox(): Row[] {
  const cols = W()
  const items = MENU.map((m, i) => ` ${i + 1}  ${m.label()}`)
  const line = (t: string, i: number): Row =>
    i === menuSel ? [[t, Style.Inverse]] : [[t.slice(0, 2), Style.Bright], [t.slice(2)]]
  // Touch: a blank line between items, so each tap target is two rows tall.
  const spaced = (rows: Row[], gap: Row) => (gaps ? rows.flatMap((r, i) => (i ? [gap, r] : [r])) : rows)
  if (cols < 34) return spaced(items.map((t, i) => line(t.slice(1), i)), [])
  const inner = 31
  const title = `─ ${EVENT.name} `
  return [
    [['┌' + title + '─'.repeat(inner - title.length) + '┐', Style.Dim]],
    ...spaced(
      items.map((t, i): Row => [['│', Style.Dim], ...line(t.padEnd(inner).slice(0, inner), i), ['│', Style.Dim]]),
      [['│', Style.Dim], [' '.repeat(inner)], ['│', Style.Dim]],
    ),
    [['└' + '─'.repeat(inner) + '┘', Style.Dim]],
  ]
}

function menuHint(): Row {
  const hint = coarse ? 'tap an option' : W() >= 42 ? '↑↓ move · enter select · or press a number' : '↑↓ · enter · or press a number'
  return [[hint, Style.Dim]]
}

/** Which menu item a box row is (frame rows and touch gap rows aren't items). */
const boxItem = (k: number) => {
  let i = W() >= 34 ? k - 1 : k
  if (gaps) {
    if (i % 2) return -1
    i /= 2
  }
  return i >= 0 && i < MENU.length ? i : -1
}

const rowWidth = (row: Row) => row.reduce((n, [t]) => n + t.length, 0)
// Rows free for content: the empty line after the last row (where the cursor
// would be) takes the bottom row.
const room = () => screen.rows - 1
const centred = (w: number) => Math.max(0, Math.floor((W() - w) / 2))

// The end screen is a fixed header plus a body that's redrawn in place when the
// highlight moves (from menuMark down, by menuBody).
let menuBody: () => void = () => {}
let marking = false
// Click/tap targets: each item's line and the columns of the menu box on it.
let menuHits: Array<{ line: object; from: number; to: number; item: number }> = []

/** Draw a row; `hit` makes its box columns a click/tap target for an item. */
function emit(row: Row, hit?: { item: number; from: number; to: number }) {
  screen.setLine(row)
  // setLine() replaces the current line, so marks and hits take the drawn row.
  if (marking) (menuMark = screen.mark()), (marking = false)
  if (hit && hit.item >= 0) menuHits.push({ ...hit, line: screen.mark() })
  screen.newline()
}

function startBody(body: () => void) {
  menuBody = body
  menuInput = false
  screen.cursor = false
  marking = true
  menuHits = []
  body()
  mode = 'menu'
}

/** Redraw just the body (the highlight moved). */
function redrawMenu() {
  if (!menuMark || !screen.rewind(menuMark)) return endScreen()
  startBody(menuBody)
}

/** The city in big lettering, or plain bright text. */
function lettering(lines: string[], big: boolean) {
  const pad = ' '.repeat(centred(Math.max(...lines.map((l) => l.length))))
  for (const line of lines) emit(big ? shaded(line, pad) : [[pad + line, Style.Bright]])
}

/** The edition, city and dates under the logo: "IX · Lisbon · 12–14 October 2027". */
const tagline = () => `${EVENT.name.replace(/^Devcon\s*/, '')} · ${EVENT.city} · ${EVENT.dateRange}`

/** The Devcon logo: the diamond beside the ANSI Shadow wordmark, as on the title card. */
function logoRows(gemRows: number): Row[] {
  const gem = diamond(gemRows, screen.cellH / screen.cellW)
  const gemW = Math.max(...gem.map((l) => l.length))
  const pad = ' '.repeat(centred(gemW + 3 + WORDMARK_WIDE[0].length))
  const top = Math.floor((WORDMARK_WIDE.length - gem.length) / 2)
  return Array.from({ length: Math.max(gem.length, WORDMARK_WIDE.length) }, (_, i): Row => {
    const mark = WORDMARK_WIDE[i - Math.max(0, -top)]
    const g = gem[i - Math.max(0, top)] ?? ''
    return [[pad + g.padEnd(gemW + 3), Style.Bright], ...(mark ? shaded(mark) : [])]
  })
}

/**
 * The end screen, drawn fresh: after the reveal (and its hold), coming back
 * from an item, ?skip and resize. The Devcon logo heads it; the drawing is
 * shown whole or not at all.
 */
function endScreen() {
  dropSessions()
  list = 'menu'
  screen.clear()
  marking = false
  gaps = coarse
  if (gaps && endHeight() > room()) gaps = false
  if (endHeight() > room() && W() >= shortWidth()) return shortEnd()
  if (W() < 76) return narrowEnd()
  // Wide: diamond + wordmark, the tagline, then the compact drawing beside the
  // menu box, when/where and the hint. Falls back to plain "DEVCON IX".
  const box = menuBox()
  const art = LISBON_COMPACT
  const artW = Math.max(...art.rows.map((l) => l.length))
  const gap = 4
  const h = Math.max(box.length, art.rows.length)
  // Roomiest first: a 7-row diamond with blank lines round the body; then a
  // 6-row one without them; then plain "DEVCON IX". 4 = tagline, when, where, hint.
  const layouts = [
    { logo: logoRows(WORDMARK_WIDE.length + 1), blanks: true },
    { logo: logoRows(WORDMARK_WIDE.length), blanks: false },
  ]
  const fit = layouts.find((l) => l.logo.length + 4 + (l.blanks ? 2 : 0) + h <= room())
  const big = fit !== undefined
  const logo = fit?.logo ?? []
  const blanks = fit?.blanks ?? true
  const fixed = 4 + (blanks ? 2 : 0)
  const head = big ? logo.length : 1
  const withArt = head + fixed + h <= room()
  const bodyH = withArt ? h : box.length
  const blockW = (withArt ? artW + gap : 0) + rowWidth(box[0])
  const margin = ' '.repeat(centred(blockW))
  const top = Math.max(0, Math.floor((room() - (head + fixed + bodyH)) / 2))
  for (let i = 0; i < top; i++) out()
  if (big) for (const row of logo) emit(row)
  else emit([[' '.repeat(centred(EVENT.name.length)) + EVENT.name.toUpperCase(), Style.Bright]])
  const line = big ? tagline() : `${EVENT.city} · ${EVENT.dateRange}`
  out(' '.repeat(centred(line.length)) + line, Style.Dim)
  if (blanks) out()
  startBody(() => {
    const artTop = Math.floor((bodyH - art.rows.length) / 2)
    const boxTop = Math.floor((bodyH - box.length) / 2)
    const rows = menuBox()
    const from = margin.length + (withArt ? artW + gap : 0)
    for (let i = 0; i < bodyH; i++) {
      const a = art.rows[i - artTop]
      const left: Row = withArt ? [...artRow((a ?? '').padEnd(artW), 0, i - artTop >= art.water), [' '.repeat(gap)]] : []
      const box = rows[i - boxTop]
      emit([[margin], ...left, ...(box ?? [])], box && { item: boxItem(i - boxTop), from, to: from + rowWidth(box) })
    }
    if (blanks) emit([])
    emit([[margin + 'when   ', Style.Dim], [EVENT.dateRange]])
    emit([[margin + 'where  ', Style.Dim], [EVENT.venue]])
    emit([[margin], ...menuHint()])
  })
}

/**
 * Narrow: the DEVCON wordmark (a small diamond above it if there's room), the
 * tagline, when/where and the menu; plain "DEVCON IX" when even that won't fit.
 */
function narrowEnd() {
  const aspect = screen.cellH / screen.cellW
  const mark = W() >= WORDMARK_WIDE[0].length + 2 ? WORDMARK_WIDE : WORDMARK_NARROW
  const fits = (n: number) => n + 1 + 2 + stackedHeight() <= room() // + tagline, when/where, menu
  const gemRows = [6, 5, 4].find((g) => fits(g + 1 + mark.length) && W() >= 8)
  const big = gemRows !== undefined || (fits(mark.length) && Math.max(...mark.map((l) => l.length)) <= W())
  const height = gemRows !== undefined ? gemRows + 1 + mark.length : big ? mark.length : 1
  const top = Math.max(0, Math.floor((room() - (height + 3 + stackedHeight())) / 2))
  for (let i = 0; i < top; i++) out()
  if (gemRows !== undefined) {
    const gem = diamond(gemRows, aspect)
    const gemW = Math.max(...gem.map((l) => l.length))
    for (const l of gem) emit([[' '.repeat(centred(gemW)) + l, Style.Bright]])
    out()
  }
  if (big) {
    const pad = ' '.repeat(centred(Math.max(...mark.map((l) => l.length))))
    for (const l of mark) emit(shaded(l, pad))
  } else {
    emit([[' '.repeat(centred(EVENT.name.length)) + EVENT.name.toUpperCase(), Style.Bright]])
  }
  const line = big ? tagline() : `${EVENT.city} · ${EVENT.dateRange}`
  out(' '.repeat(centred(line.length)) + line, Style.Dim)
  whenRow()
  whereRow()
  stackedMenu()
}

/** The fewest rows the end screen's layout takes ("DEVCON IX", tagline, when/where, menu, hint). */
const endHeight = () => (W() < 76 ? 4 + stackedHeight() : 7 + menuBox().length)

// Short screens (a phone on its side): the facts beside the menu box.
const shortInfo = (): Row[] => [
  [[EVENT.name.toUpperCase(), Style.Bright]],
  [],
  [[`${EVENT.city} · ${EVENT.dateRange}`]],
  [[EVENT.venue, Style.Dim]],
]
const SHORT_GAP = 4
const shortWidth = () => Math.max(...shortInfo().map(rowWidth)) + SHORT_GAP + 33

/** The end screen when the others won't fit the height: facts | menu box, then the hint. */
function shortEnd() {
  const info = shortInfo()
  const infoW = Math.max(...info.map(rowWidth))
  const margin = ' '.repeat(centred(infoW + SHORT_GAP + rowWidth(menuBox()[0])))
  const top = Math.max(0, Math.floor((room() - menuBox().length - 1) / 2))
  for (let i = 0; i < top; i++) out()
  startBody(() => {
    const rows = menuBox()
    const from = margin.length + infoW + SHORT_GAP
    const infoTop = Math.floor((rows.length - info.length) / 2)
    rows.forEach((row, i) => {
      const left = info[i - infoTop] ?? []
      emit([[margin], ...left, [' '.repeat(infoW - rowWidth(left) + SHORT_GAP)], ...row], { item: boxItem(i), from, to: from + rowWidth(row) })
    })
    emit([[margin], ...menuHint()])
  })
}

/** Rows the stacked menu takes (box, plus a blank before the hint when unframed, plus the hint). */
function stackedHeight() {
  return menuBox().length + (W() < 34 ? 1 : 0) + 1
}

/** The menu (and hint) under whatever is on screen: narrow screens. */
function stackedMenu() {
  const pad = ' '.repeat(Math.max(0, Math.min(2, W() - 33)))
  startBody(() => {
    const rows = menuBox()
    const width = Math.max(...rows.map(rowWidth))
    rows.forEach((row, k) => emit([[pad], ...row], { item: boxItem(k), from: pad.length, to: pad.length + width }))
    if (W() < 34) emit([])
    emit([[pad], ...menuHint()])
  })
}

// ---------------------------------------------------------------------------
// Past Devcons (menu item 3): the editions as a list of their own, drawn and
// driven like the menu (mode 'menu', with `list` saying which). Each opens its
// talks on the archive in a new tab; the last row goes back to the menu.

let list: 'menu' | 'past' = 'menu'
let pastSel = 0
let pastNote = ''
const BACK = HISTORY.length // the back row's item
const pastOk = (i: number) => i === BACK || !!HISTORY[i]?.archive

/** The list's rows: each edition (dim with "(no talks yet)" when it has none), then back. */
function pastRows(): Array<{ row: Row; item?: number }> {
  const nameW = Math.max(...HISTORY.map((e) => e.name.length)) + 2
  // The full note is 34 columns wide; a 32-column screen gets the short one.
  const none = W() >= 35 ? '  (no talks yet)' : '  (no talks)'
  const items = [
    ...HISTORY.map((e, i) => ({ num: ` ${i}`, rest: `  ${e.name.padEnd(nameW)}${e.year}`, none: e.archive ? '' : none })),
    // No arrow: ← is the background switch's key, not "back".
    { num: '  ', rest: '  Back to the menu', none: '' },
  ]
  const width = Math.min(W(), Math.max(...items.map((t) => t.num.length + t.rest.length + t.none.length)) + 1)
  const rows = items.map(({ num, rest, none }, i): { row: Row; item?: number } => {
    const text = (num + rest + none).padEnd(width).slice(0, width)
    if (none) return { row: [[text, Style.Dim]] }
    if (i === pastSel) return { row: [[text, Style.Inverse]], item: i }
    return { row: [[num, Style.Bright], [text.slice(num.length)]], item: i }
  })
  // Touch: a blank line between rows, as in the menu.
  return gaps ? rows.flatMap((r, i) => (i ? [{ row: [] }, r] : [r])) : rows
}

function pastHint() {
  if (coarse) return 'tap an edition to watch its talks'
  return W() >= 46 ? `↑↓ move · enter watch · esc back · or 0–${BACK - 1}` : '↑↓ · enter · esc · or a number'
}

function pastList() {
  list = 'past'
  pastNote = ''
  if (!pastOk(pastSel)) pastSel = 0
  screen.clear()
  marking = false
  // Title, subtitle, blank, rows, blank, hint, note; a short screen drops the
  // touch gaps, then the subtitle and blanks, and shows the note in the hint's place.
  gaps = coarse
  if (gaps && pastRows().length + 6 > room()) gaps = false
  const short = pastRows().length + 6 > room()
  const width = Math.max(...pastRows().map((r) => rowWidth(r.row)))
  const pad = ' '.repeat(centred(width))
  const top = Math.max(0, Math.floor((room() - (pastRows().length + (short ? 2 : 6))) / 2))
  for (let i = 0; i < top; i++) out()
  out(pad + 'Past Devcons', Style.Bright)
  if (!short) out(pad + `Their talks, on ${display(LINKS.archive)}`, Style.Dim), out()
  startBody(() => {
    for (const { row, item } of pastRows()) emit([[pad], ...row], item === undefined ? undefined : { item, from: pad.length, to: pad.length + width })
    if (short) return emit([[pad + (pastNote || pastHint()), Style.Dim]])
    emit([])
    emit([[pad + pastHint(), Style.Dim]])
    emit([[pad + pastNote, Style.Dim]])
  })
}

/** Open an edition's talks in a new tab (editions without any do nothing), or go back. */
function openPast(i: number) {
  if (i === BACK) {
    sound.key()
    menuHome = true
    return endScreen()
  }
  const e = HISTORY[i]
  if (!e?.archive) return
  sound.key()
  pastSel = i
  // With noopener this returns null even when it works.
  window.open(e.archive, '_blank', 'noopener')
  pastNote = `Devcon ${i}'s talks opened in a new tab`
  redrawMenu()
}

/** ↑↓ in the list, skipping editions without talks. */
function stepPast(step: number) {
  do pastSel = (pastSel + step + BACK + 1) % (BACK + 1)
  while (!pastOk(pastSel))
  sound.key()
  redrawMenu()
}

function pressForMenu() {
  // One blank line above, whether or not the output already ended with one.
  if (screen.lineLength(screen.lines[screen.lines.length - 2] ?? []) > 0) out()
  out(coarse ? 'tap for the menu' : 'press any key for the menu', Style.Dim)
  screen.cursor = false
  mode = 'more'
}

async function runItem(i: number) {
  const item = MENU[i]
  if (!item) return
  sound.key()
  tube.style.cursor = ''
  if (item.run) return item.run()
  if (!item.cmd) {
    menuHome = false
    screen.clear()
    out('type `menu` to come back', Style.Dim)
    return askShell()
  }
  mode = 'busy'
  screen.clear()
  for (const [t, st] of promptRow()) screen.write(t, st)
  screen.write(item.cmd, Style.Bright)
  screen.newline()
  try {
    await shell(item.cmd)
  } catch (e) {
    if (e !== ABORT) throw e
  }
}

/** Wrap prose to the screen under an indent, so continuation lines line up. */
function indented(text: string, indent: number, style = Style.Dim) {
  const width = Math.max(10, W() - indent)
  let line = ''
  for (const word of text.split(' ')) {
    if (line && line.length + 1 + word.length > width) {
      out(' '.repeat(indent) + line, style)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) out(' '.repeat(indent) + line, style)
}

/**
 * `history`: every Devcon; `-v` adds a hook under each, `--all` adds the
 * Devconnects (dim, in date order), `history <n>` shows one edition.
 */
function showHistory(args: string[]) {
  const n = args.find((a) => /^\d+$/.test(a))
  const verbose = args.includes('-v') || n !== undefined
  const all = args.includes('--all')
  const editions = [...HISTORY, { id: CITY_ID, name: EVENT.city, year: YEAR, hook: '', archive: null }]
  if (n !== undefined && !editions[+n]) return out(`usage: history [-v] [--all] [0-${editions.length - 1}] | history open <n>`)
  const width = Math.max(...editions.map((e) => e.name.length), ...(all ? DEVCONNECT.map((d) => d.name.length) : [])) + 2
  editions.forEach((e, i) => {
    if (n !== undefined && +n !== i) return
    const now = i === HISTORY.length
    screen.setLine([[`  #${i}  `, Style.Dim], [e.name.padEnd(width), now ? Style.Bright : Style.Normal], [e.year, now ? Style.Bright : Style.Dim]])
    screen.newline()
    if (verbose && e.hook) indented(ttyText(e.hook), 6)
    if (n !== undefined && i < HISTORY.length) indented(e.archive ? `talks: ${display(e.archive)}` : 'talks: not on the archive yet', 6, Style.Normal)
    if (all && n === undefined) {
      for (const d of DEVCONNECT.filter((d) => d.after === i)) {
        screen.setLine([['      '], [d.name.padEnd(width), Style.Dim], [d.year, Style.Dim]])
        screen.newline()
      }
    }
  })
}

/** `history open <n>`, `archive <n>`: one edition's talks, in a new tab. */
function openTalks(arg = '') {
  const e = /^\d+$/.test(arg) ? HISTORY[+arg] : undefined
  if (!e) return out(`usage: history open [0-${HISTORY.length - 1}]`)
  if (!e.archive) return out(`Devcon ${arg}'s talks aren't on the archive yet.`)
  openLink([`Devcon ${arg}, ${e.name} ${e.year}: ${display(e.archive)}`], e.archive)
}

/** "https://devcon.org/en/x/" → "devcon.org/en/x", for printing. */
const display = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

/** Print the lines, then open `url` in a new tab. */
function openLink(lines: string[], url: string) {
  for (const l of lines) out(l)
  // With noopener this returns null even when it works; a blocked popup leaves the printed URL.
  window.open(url, '_blank', 'noopener')
}

// TODO: the copy below and the linked notice need sign-off from the EF privacy
// owner before launch. The current notice covers Devcon 8 ticketing only, and
// doesn't mention the waitlist, Netlify or a mailing tool.
function showPrivacy() {
  openLink(
    [
      "We'll use your email to send you news about Devcon IX.",
      `Questions about your data: ${LINKS.privacyContact}`,
      `Full notice: ${display(LINKS.privacy)}`,
    ],
    LINKS.privacy,
  )
}

/** The waitlist question, unless this browser has already signed up. */
function offerWaitlist(again = false) {
  if (again || !hasJoined()) return askWaitlist()
  out("You're already on the list.")
  askAgain()
}

const MAX_INPUT = 254
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

async function submit() {
  const line = input.trim()
  screen.newline()
  const m = mode
  mode = 'busy'
  try {
    if (m === 'yn') {
      const yes = /^y(es)?$/i.test(line) || (line === '' && ynDefault)
      const no = /^n(o)?$/i.test(line) || (line === '' && !ynDefault)
      if (yes) askEmail()
      else if (no) {
        // Declining the first question gets a pointer; declining "again" just returns.
        if (ynDefault) out('No problem. Type `waitlist` whenever you like.')
        if (ynDefault && !menuHome) out('Type `help` to look around.', Style.Dim)
        askShell()
      } else {
        out('Please answer y or n.', Style.Dim)
        askYn()
      }
      return
    }
    if (m === 'email') {
      // An empty Enter asks again; Esc or Ctrl+C cancels.
      if (!line) askEmail(false)
      else if (line.toLowerCase() === 'privacy') {
        showPrivacy()
        askEmail(false)
      } else if (!EMAIL.test(line)) {
        out(`devcon: '${line}': not a valid address.`, Style.Dim)
        askEmail(false)
      } else {
        // Stays 'busy' (keys ignored) until the request settles; it times out after 10 s.
        const res = await spinUntil('Contacting the Devcon waitlist', submitWaitlist(line, 'terminal'), (r) =>
          r.ok ? 'connected' : 'failed',
        )
        if (res.ok) {
          await status(`Adding ${line}`, 530)
          out()
          syncSrMenu()
          out(`You're on the list. See you in ${EVENT.city}.`, Style.Bright)
          if (!menuHome) out('Type `help` to look around, or `exit` to power off.', Style.Dim)
        } else {
          await status(`Adding ${line}`, 175, 'FAILED')
          out("Couldn't reach the waitlist. Type `waitlist` to try again.", Style.Dim)
        }
        out()
        askShell()
      }
      return
    }
    if (m === 'shell') {
      if (line) {
        recall.push(line)
        recallAt = recall.length
      }
      await shell(line)
    }
  } catch (e) {
    if (e !== ABORT) throw e
  }
}

// Every shell command and alias, for Tab completion (keep in step with shell()).
const COMMANDS = [
  'help', 'privacy', 'menu', 'open', 'devcon.org', 'web', 'www', 'archive', 'talks', 'coc', 'conduct',
  'contact', 'support', 'sponsor', 'supporters', 'waitlist', 'join', 'about', 'info', 'neofetch',
  'history', 'mail', 'color', 'colour', 'sound', 'clear', 'cls', 'reboot', 'restart', 'exit', 'logout',
  'shutdown', 'poweroff', 'cd', 'ls', 'cat', './devcon', 'devcon', 'whoami', 'pwd', 'date', 'uname', 'echo',
  'ping', 'sudo', 'rm', 'vi', 'vim', 'emacs', 'nano', 'man',
]
// Not listed: `bg`, found only through `cat .backgrounds`.

/** Tab at the shell: a unique prefix completes; several matches are listed and the prompt redrawn. */
function complete() {
  if (input.includes(' ')) return
  const matches = COMMANDS.filter((c) => c.startsWith(input)).sort()
  if (!matches.length) return
  if (matches.length === 1) {
    input = matches[0] + ' '
    return echoInput()
  }
  // Extend to the longest common prefix first, like bash.
  let common = matches[0]
  for (const m of matches) while (!m.startsWith(common)) common = common.slice(0, -1)
  if (common.length > input.length) {
    input = common
    return echoInput()
  }
  screen.newline()
  out(matches.join('  '))
  const typed = input
  ask(promptRow(), 'shell')
  input = typed
  echoInput()
}

const HELP = [
  ['waitlist', 'join the Devcon IX waitlist'],
  ['privacy', 'how we use your email'],
  ['about', 'what, where and when'],
  ['history', 'every Devcon so far'],
  ['mail', 'read your mail'],
  ['devcon.org', 'the Devcon website'],
  ['archive', 'every Devcon talk'],
  ['coc', 'code of conduct'],
  ['contact', 'get in touch'],
  ['color', 'green | amber | white'],
  ['sound', 'on | off'],
  ['clear', 'clear the screen'],
  ['reboot', 'start over'],
  ['exit', 'power off'],
]

// ---------------------------------------------------------------------------
// ssh (an easter egg): log into a past edition's machine (`ssh osaka`,
// `ssh devcon5`), or back into this one (`ssh lisboa`), which nests. `exit`
// unwinds one hop at a time. `ls -a` shows .ssh, whose known_hosts is the hint.

interface Session {
  from: string // the host to return to
  cwd: Dir // and the directory there
  edition?: Edition // a past edition's machine; none for this one
}
const sessions: Session[] = []
const MAX_HOPS = 9

/** Back to the machine the first hop left from (the menu, a reboot). */
function dropSessions() {
  if (sessions.length) (host = sessions[0].from), (cwd = sessions[0].cwd)
  sessions.length = 0
}

const fold = (s: string) => s.normalize('NFD').replace(/[^\x20-\x7e]/g, '').toLowerCase()

/** A target host: a past edition, this machine, a future one, or nothing. */
function resolveHost(name: string): Edition | 'home' | 'future' | null {
  const h = fold(name).replace(/\.devcon\.org$/, '')
  const n = /^devcon-?(\d+)$/.exec(h)?.[1]
  if (n !== undefined) return +n < HISTORY.length ? HISTORY[+n] : +n === HISTORY.length ? 'home' : 'future'
  const e = HISTORY.find((x) => x.id === h || fold(x.name) === h)
  if (e) return e
  if (['localhost', '127.0.0.1', host, EVENT.host, CITY_ID, 'devcon', 'devcon-ix', 'devconix'].includes(h)) return 'home'
  return null
}

function knownHosts() {
  const key = (id: string) => 'AAAAB3NzaC1yc2EAAAABIwAAAIEA' + btoa(`${id}:devcon`).replace(/=/g, '')
  return [...HISTORY.map((e, i) => `${e.id},devcon${i} ssh-rsa ${key(e.id)}`), `${EVENT.host} ssh-rsa ${key(EVENT.host)}`]
}

async function ssh(args: string[]) {
  const target = args.find((a) => !a.startsWith('-'))
  if (!target) return out('usage: ssh [user@]hostname')
  const [user, name] = target.includes('@') ? target.split('@', 2) : ['guest', target]
  const dest = resolveHost(name)
  if (!dest) return out(`ssh: Could not resolve hostname ${name}: Name or service not known`)
  if (dest === 'future') return out(`ssh: connect to host ${name} port 22: Connection refused (not built yet)`)
  if (sessions.length >= MAX_HOPS) return out(`ssh: ${MAX_HOPS} hops deep already. Type \`exit\` to surface.`)
  const to = dest === 'home' ? EVENT.host : dest.id
  sound.seek(3, 0.4)
  await wait(500)
  screen.write(`${user}@${to}'s password: `)
  await wait(400)
  await type('********', Style.Normal, false)
  screen.newline()
  await wait(500)
  if (user !== 'guest') return out('Permission denied (publickey,password).')
  if (dest === 'home') {
    out(`Last login: ${new Date().toString().slice(0, 24)} from ${host}`)
  } else {
    const i = HISTORY.indexOf(dest)
    out(`Last login: ${dest.year} from ${i ? HISTORY[i - 1].id : 'nowhere (this is the first one)'}`)
    out()
    out(`  Devcon ${i} · ${dest.name} · ${dest.year}`, Style.Bright)
    indented(ttyText(dest.hook), 2)
    out()
    out('  Type `talks` to watch, `exit` to come back.', Style.Dim)
  }
  sessions.push({ from: host, cwd, edition: dest === 'home' ? undefined : dest })
  host = to
  cwd = '~'
  // Stay at the prompt between commands (not back to the menu).
  menuHome = false
  menuInput = false
}

function disconnect() {
  const s = sessions.pop()!
  out('logout')
  out(`Connection to ${host} closed.`)
  host = s.from
  cwd = s.cwd
}

/** Commands that differ on a past edition's machine; false falls through to the local ones. */
function remoteCommand(cmd: string, args: string[], e: Edition) {
  const i = HISTORY.indexOf(e)
  const arg = args.join(' ')
  switch (cmd) {
    case 'ls':
      out('README  talks')
      return true
    case 'cat':
      if (arg === 'README') {
        out(`Devcon ${i}, ${e.name}, ${e.year}.`)
        indented(ttyText(e.hook), 0, Style.Normal)
      } else out(`cat: ${arg || '?'}: No such file or directory`)
      return true
    case 'talks':
    case 'archive':
    case 'cd':
    case './talks':
      if (cmd === 'cd' && arg !== 'talks') return false
      openTalks(String(i))
      return true
    case 'date':
      out(`It's ${e.year} here.`)
      return true
    case 'hostname':
      out(host)
      return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Games (an easter egg; see games/). A game takes over the screen like a
// full-screen program, and q or Esc hands back the screen as it was.

interface Playing {
  name: string
  game: Game
  saved: typeof screen.lines
  cols: number
  rows: number
  last: number
}
let playing: Playing | null = null
const QUIT = coarse ? '[ quit ]' : 'q quits'

/**
 * The game a command names, if any: `pong` anywhere (the games are on the
 * PATH, like /usr/games), `./pong` inside games, `games/pong` from home, and
 * `~/games/pong` or `/usr/games/pong` from anywhere.
 */
function gameCommand(cmd: string) {
  if (cmd in GAMES) return cmd
  const m = /^(\.\/|games\/|\.\/games\/|~\/games\/|\/usr\/games\/)([a-z]+)$/.exec(cmd)
  if (!m || !LISTED.includes(m[2])) return null
  const here = m[1] === './' ? inGames() : m[1] === 'games/' || m[1] === './games/' ? !inGames() : true
  return here ? m[2] : null
}

/** `cd`: home, games (or /usr/games), and back. */
function cd(arg: string) {
  const to = arg.replace(/(.)\/+$/, '$1')
  if (!to || to === '~' || to === '/home/guest' || (to === '..' && inGames())) cwd = '~'
  else if (to === '.' || (to === '..' && !inGames())) return
  else if (to === '~/games' || to === '/home/guest/games' || (!inGames() && (to === 'games' || to === './games'))) cwd = '~/games'
  else if (to === '/usr/games') cwd = '/usr/games'
  else out(`sh: cd: ${arg}: No such file or directory`)
}

function gameEnv(name: string): Env {
  const key = `devcon-tty-best-${name}`
  let best: number | null = null
  return {
    cols: screen.cols,
    rows: screen.rows - 1,
    coarse,
    reduced,
    blip: (f, d) => sound.blip(f, d),
    best(score) {
      if (best === null) {
        best = 0
        try {
          best = Number(localStorage.getItem(key)) || 0
        } catch {}
      }
      if (score !== undefined && score > best) {
        best = score
        try {
          localStorage.setItem(key, String(score))
        } catch {}
      }
      return best
    },
    cities: HISTORY.map((e) => e.id),
    pictures: gamePictures(),
  }
}

/** Starting pictures for `life`, sized to the screen. */
function gamePictures() {
  const mark = (W() >= WORDMARK_WIDE[0].length + 2 ? WORDMARK_WIDE : WORDMARK_NARROW).map((l) => l.replace(/[^█]/g, ' '))
  const city = W() >= Math.max(...LISBON_WIDE.rows.map((l) => l.length)) ? LISBON_WIDE : LISBON_COMPACT
  return [
    { name: 'devcon', rows: mark },
    { name: 'ether', facets: true, rows: diamond(Math.max(6, Math.min(screen.rows - 4, 18)), screen.cellH / screen.cellW) },
    { name: 'lisbon', rows: city.rows.slice(0, city.water) },
    { name: 'lisboa', rows: pixelWord('LISBOA') },
  ]
}

function startGame(name: string) {
  playing = { name, game: GAMES[name].make(gameEnv(name)), saved: screen.lines.slice(), cols: screen.cols, rows: screen.rows, last: performance.now() }
  mode = 'game'
  screen.cursor = false
  kbd.blur()
  // Drags steer paddles on touch screens, so they mustn't scroll the page.
  tube.style.touchAction = 'none'
  tube.style.cursor = playing.game.cursor ?? ''
  requestAnimationFrame(gameFrame)
}

function gameFrame(now: number) {
  const p = playing
  if (!p) return
  // Power off, a replay or the menu took over: just let go.
  if (mode !== 'game') return stopGame()
  if (screen.cols !== p.cols || screen.rows !== p.rows) {
    p.game = GAMES[p.name].make(gameEnv(p.name))
    p.cols = screen.cols
    p.rows = screen.rows
  }
  p.game.tick(Math.min(0.05, (now - p.last) / 1000))
  p.last = now
  if (p.game.done) return endGame()
  const grid = new Grid(screen.cols, screen.rows - 1)
  p.game.draw(grid)
  const left = ` ${GAMES[p.name].title}   `
  const quit = p.game.stubborn ? '' : QUIT + ' '
  const room = Math.max(0, screen.cols - left.length - quit.length)
  screen.blit([[[left, Style.Bright], [p.game.status().slice(0, Math.max(0, room - 1)).padEnd(room), Style.Dim], [quit, Style.Dim]], ...grid.rowsOut()])
  requestAnimationFrame(gameFrame)
}

function stopGame() {
  playing = null
  tube.style.touchAction = ''
  tube.style.cursor = ''
}

/** Quit (or the game ended itself): the screen as it was, and the prompt. */
function endGame() {
  const p = playing
  if (!p) return
  stopGame()
  screen.lines = p.saved
  screen.touch()
  mode = 'busy'
  askShell()
}

function gameKey(e: KeyboardEvent, down: boolean) {
  const p = playing
  if (!p) return
  if (e.key === 'Tab') return
  e.preventDefault()
  if (down && e.repeat) return
  const quit = e.key === 'Escape' || e.key === 'q' || e.key === 'Q' || (e.ctrlKey && e.key === 'c')
  if (down && quit && !p.game.stubborn) return endGame()
  if (!e.ctrlKey) p.game.key?.(e.key, down)
}

function gamePointer(e: PointerEvent, kind: 'down' | 'move' | 'up') {
  const p = playing
  if (mode !== 'game' || !p) return
  const { row, col, fy } = cellAtPoint(e.clientX, e.clientY)
  if (kind === 'down' && row === 0 && !p.game.stubborn && col >= screen.cols - QUIT.length - 2) return endGame()
  p.game.pointer?.(col + 0.5, (row - 1 + fy) * 2, kind)
}

async function shell(line: string) {
  if (isNuke(line)) return nuke()
  const [cmd = '', ...args] = line.split(/\s+/).filter(Boolean)
  const arg = args.join(' ')
  if (cmd === 'ssh' || cmd === 'slogin') {
    await ssh(args)
    return askShell()
  }
  if ((cmd === 'exit' || cmd === 'logout') && sessions.length) {
    disconnect()
    return askShell()
  }
  const remote = sessions.at(-1)?.edition
  if (remote && remoteCommand(cmd, args, remote)) return askShell()
  // Games run from the shell proper, not the command line under the menu.
  const game = menuHome ? null : gameCommand(cmd)
  if (game) return startGame(game)
  switch (cmd) {
    case '':
      break
    case 'help':
    case '?':
      out('Commands:')
      for (const [c, d] of HELP) screen.setLine([['  ' + c.padEnd(12), Style.Bright], [d]]), screen.newline()
      out('...and a few more, if you look around.', Style.Dim)
      break
    case 'privacy':
      showPrivacy()
      break
    case 'bg': {
      // Hidden (not in help): list the scenes, or switch to one.
      const names = backgroundNames()
      const n = Number(arg)
      if (!arg) names.forEach((name, i) => out(`${i === currentBackground() ? '*' : ' '} ${i + 1}  ${name}`))
      else if (n >= 1 && n <= names.length) setBackground(n)
      else out(`usage: bg [1-${names.length}]`)
      break
    }
    case 'skin': {
      // Hidden too: list the skins, or switch to one.
      const names = skinNames()
      const n = Number(arg)
      if (!arg) names.forEach((name, i) => out(`${i === currentSkin() ? '*' : ' '} ${i + 1}  ${name}`))
      else if (n >= 1 && n <= names.length) setSkin(n)
      else out(`usage: skin [1-${names.length}]`)
      break
    }
    case 'menu':
      menuHome = true
      endScreen()
      return
    case 'open':
      if (arg !== 'devcon.org') {
        out('usage: open devcon.org')
        break
      }
    // falls through
    case 'devcon.org':
    case 'web':
    case 'www':
      openLink([`Opening ${display(LINKS.home)} ...`], LINKS.home)
      break
    case 'archive':
    case 'talks':
      if (arg) {
        openTalks(arg)
        break
      }
      openLink([`Every Devcon talk since ${HISTORY[0].year}: ${display(LINKS.archive)}`], LINKS.archive)
      break
    case 'coc':
    case 'conduct':
      openLink(
        [
          'Devcon is for everyone. Be kind, be respectful, and help others do the same.',
          `Full code of conduct: ${display(LINKS.codeOfConduct)}`,
        ],
        LINKS.codeOfConduct,
      )
      break
    case 'contact':
    case 'support':
      out(`Questions? ${LINKS.contact}`)
      break
    case 'sponsor':
    case 'supporters':
      openLink(
        [
          'Supporter applications for Devcon IX open in 2027.',
          `Learn how the Supporters Program works: ${display(LINKS.supporters)}`,
        ],
        LINKS.supporters,
      )
      break
    case 'waitlist':
    case 'join':
      offerWaitlist(args.includes('--again'))
      return
    case 'about':
    case 'info':
    case 'neofetch': {
      const { logo, info } = card()
      for (const r of [...logo, ...info]) screen.setLine(r), screen.newline()
      break
    }
    case 'history':
      if (args[0] === 'open') openTalks(args[1])
      else showHistory(args)
      break
    case 'mail':
      out(
        `From devcon  ${startPart({ weekday: 'short' })} ${startPart({ month: 'short' })} ${String(START.getUTCDate()).padStart(2)} 09:00:00 ${START.getUTCFullYear()}`,
        Style.Dim,
      )
      out(`Subject: ${EVENT.city}`, Style.Dim)
      out()
      out(`  ${EVENT.name}: ${EVENT.venue},`)
      out(`  ${EVENT.city}, ${EVENT.country}. ${EVENT.dateRange}.`)
      out()
      out('  Type `waitlist` to hear first.')
      break
    case 'color':
    case 'colour': {
      const c = arg as keyof typeof PHOSPHOR
      if (!(c in PHOSPHOR)) out('usage: color green|amber|white (or press C on the menu)')
      else {
        setColor(c)
        setGlow(true)
      }
      break
    }
    case 'sound':
      if (arg === 'on' || arg === 'off') setMuted(arg === 'off')
      else out(`sound is ${sound.muted ? 'off' : 'on'}. usage: sound on|off`)
      break
    case 'clear':
    case 'cls':
      screen.clear()
      break
    case 'reboot':
    case 'restart':
      // Off, then (wanted on again) back on.
      requestPower(false)
      wantOn = true
      return
    case 'exit':
    case 'logout':
    case 'shutdown':
    case 'poweroff':
      out('Powering off.')
      await wait(295)
      requestPower(false)
      return
    case 'cd':
      cd(arg)
      break
    case 'ls':
      if (inGames() && !args.some((a) => !a.startsWith('-'))) out((args.includes('-a') ? '.  ..  ' : '') + LISTED.join('  '))
      else if (/^(~\/|\.\/)?(games|\/usr\/games)\/?$/.test(arg)) out(LISTED.join('  '))
      else if (arg === '.ssh' || arg === '.ssh/') out('known_hosts')
      else out(args.includes('-a') ? '.  ..  .backgrounds  .plan  .ssh  Makefile  README  devcon  devcon.c  games' : 'Makefile  README  devcon  devcon.c  games')
      break
    case 'cat':
      if (arg === 'devcon.c') await lines(SOURCE, 0, 0)
      else if (arg === 'README') out(`${EVENT.name}. ${EVENT.city}. ${EVENT.dateRange}. Type \`waitlist\`.`)
      else if (arg === '.ssh/known_hosts') knownHosts().forEach((l) => out(l, Style.Dim))
      else if (/^(~\/|\.\/)?(games|\/usr\/games)\/?$/.test(arg)) out(`cat: ${arg}: Is a directory`)
      else if (inGames() && LISTED.includes(arg.replace(/^\.\//, ''))) out(`cat: ${arg}: binary file (try ./${arg.replace(/^\.\//, '')})`)
      else if (arg === '.backgrounds') out('Try A and D on the menu (← and → work too).', Style.Dim)
      else if (arg === '.plan') out(`Be in ${EVENT.city} in ${startPart({ month: 'long' })} ${START.getUTCFullYear()}.`)
      else if (arg === 'Makefile') out('devcon: devcon.c\n\tcc -O2 -o devcon devcon.c -lp2p')
      else out(`cat: ${arg || '?'}: No such file or directory`)
      break
    case './devcon':
    case 'devcon':
      out('devcon: already running.')
      break
    case 'whoami':
      out('guest')
      break
    case 'pwd':
      out(cwd === '/usr/games' ? cwd : cwd.replace('~', '/home/guest'))
      break
    case 'date':
      out(new Date().toString().slice(0, 24))
      break
    case 'uname':
      out(args.includes('-a') ? `Linux ${host} 2.0.36 #9 Tue Oct 12 1999 i486` : 'Linux')
      break
    case 'echo':
      out(arg)
      break
    case 'ping':
      for (let i = 0; i < 3; i++) {
        out(`64 bytes from ${arg || 'devcon'}: icmp_seq=${i} ttl=64 time=${(rand(20, 40)).toFixed(1)} ms`)
        await wait(350)
      }
      break
    case 'sudo':
      out('guest is not in the sudoers file. This incident will be reported.')
      break
    case 'rm':
      out("rm: let's not.")
      break
    case 'vi':
    case 'vim':
    case 'emacs':
    case 'nano':
      out(`${cmd}: the file is fine as it is.`)
      break
    case 'man':
      out(arg === 'devcon' ? `DEVCON(IX)    ${EVENT.name}, ${EVENT.city}, ${EVENT.dateRange}. See: waitlist.` : `No manual entry for ${arg || '?'}`)
      break
    default:
      out(`sh: ${cmd}: command not found. Try \`help\`.`)
  }
  askShell()
}

function onChar(ch: string) {
  if (mode === 'more') return endScreen()
  if (mode === 'menu') {
    const n = Number(ch)
    if (n >= 1 && n <= MENU.length) return void runItem(n - 1)
    if (ch === ' ') return
    // Anything else starts a command line under the menu.
    ask(promptRow(), 'shell')
    menuInput = true
  }
  if (mode === 'yn') {
    // The answer waits for Enter, so a reflexive Enter can't land on the next prompt.
    input = ch
    echoInput()
    sound.key()
    return
  }
  if (mode !== 'email' && mode !== 'shell') return
  // Input wraps onto the next line(s); 254 is the longest valid email address.
  if (input.length >= MAX_INPUT) return
  input += ch
  sound.key()
  echoInput()
}

/**
 * A character typed with AltGr (Windows, Linux) or Option (Mac) rather than a
 * shortcut: @ is AltGr+2 on Portuguese keyboards, AltGr+Q on German, Option+2 on
 * a Portuguese Mac, and most layouts outside the US reach some of `@ [ ] { } ~`
 * and accented letters that way. Windows browsers report AltGr as Ctrl+Alt, Linux
 * ones as AltGraph alone, Macs as Alt. A plain Alt+letter/digit (a Windows menu
 * accelerator) stays a shortcut.
 */
function composedChar(e: KeyboardEvent) {
  if (e.key.length !== 1) return false
  if (e.getModifierState('AltGraph')) return true
  return e.altKey && (e.ctrlKey || !/[a-z0-9]/i.test(e.key))
}

function onKey(e: KeyboardEvent) {
  const text = composedChar(e)
  if (e.metaKey || (e.altKey && !text)) return
  if (mode === 'game') return gameKey(e, true)
  // The shortcut sheet: ? toggles it wherever nothing is being typed; while it's
  // open the terminal ignores keys (the dialog closes itself on Esc).
  if (keysSheet.open) {
    if (e.key === '?') {
      e.preventDefault()
      keysSheet.close()
    }
    return
  }
  if (e.key === '?' && !e.ctrlKey && mode !== 'email' && mode !== 'yn' && !(mode === 'shell' && input)) {
    e.preventDefault()
    keysSheet.showModal()
    return
  }
  // Keys aimed at the screen-reader menu and form belong to them, not the terminal;
  // except a menu number on a menu item, which acts as it would on the canvas.
  // Focus leaves the mirror, so whatever follows (an email, the shell) reaches the terminal.
  const target = e.target as HTMLElement
  if (target.closest?.('main')) {
    const n = Number(e.key)
    if (!(n >= 1 && n <= MENU.length && !e.ctrlKey && target.closest('main nav'))) return
    target.blur()
  }
  // Easter eggs, like a video game: A/D step through the backgrounds, W/S the
  // skins, C the phosphor colours. Letters only on the menu and the start screen
  // (anywhere else they're typing); ←/→ and [/] do the same anywhere text isn't
  // being typed.
  const typing = mode === 'email' || (mode === 'shell' && !!input)
  const letters = (mode === 'menu' || mode === 'start') && !e.ctrlKey ? e.key.toLowerCase() : ''
  const bgStep = letters === 'a' || (e.key === 'ArrowLeft' && !typing) ? -1 : letters === 'd' || (e.key === 'ArrowRight' && !typing) ? 1 : 0
  const skinStep = letters === 'w' || (e.key === '[' && !typing) ? -1 : letters === 's' || (e.key === ']' && !typing) ? 1 : 0
  if ((bgStep || skinStep) && !e.ctrlKey && !(e.shiftKey && e.key.startsWith('Arrow'))) {
    e.preventDefault()
    if (skinStep) switchSkin(skinStep)
    else switchBackground(bgStep)
    return
  }
  if (letters === 'c') {
    e.preventDefault()
    const colors = Object.keys(PHOSPHOR) as Array<keyof typeof PHOSPHOR>
    const next = (colors.indexOf(currentColor()) + 1) % colors.length
    setColor(colors[next])
    setGlow(true)
    showToast(`Colour ${next + 1}/${colors.length} · ${cap(colors[next])}`, true)
    return
  }
  if (mode === 'start') {
    // Only Enter starts (Tab and the rest do nothing here); Enter on a focused
    // chin button belongs to the button.
    if (e.key === 'Enter' && !(e.target as Element).closest?.('button, a')) {
      e.preventDefault()
      void startBoot()
    }
    return
  }
  if (mode === 'off') {
    if (['Tab', 'Shift', 'Control', 'Meta', 'Alt'].includes(e.key)) return
    e.preventDefault()
    requestPower(true)
    return
  }
  if (mode === 'hold') {
    if (['Tab', 'Shift', 'Control', 'Meta', 'Alt'].includes(e.key)) return
    e.preventDefault()
    holdSkip?.()
    return
  }
  if (e.key === 'Escape' && mode === 'boot') {
    e.preventDefault()
    skip()
    return
  }
  if (e.ctrlKey && !text) {
    if (e.key === 'c' && (mode === 'shell' || mode === 'email')) {
      screen.write('^C')
      screen.newline()
      if (mode === 'email') out('Cancelled.', Style.Dim)
      askShell()
    }
    if (e.key === 'l' && mode === 'shell') {
      screen.clear()
      askShell()
    }
    e.preventDefault()
    return
  }
  if (mode === 'busy' || mode === 'boot') return
  if (mode === 'more') {
    if (['Shift', 'Control', 'Meta', 'Alt', 'Tab'].includes(e.key)) return
    e.preventDefault()
    return endScreen()
  }
  if (mode === 'menu' && list === 'past') {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      stepPast(e.key === 'ArrowUp' ? -1 : 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      openPast(pastSel)
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault()
      openPast(BACK)
    } else if (/^\d$/.test(e.key)) {
      e.preventDefault()
      openPast(+e.key)
    }
    return
  }
  if (mode === 'menu') {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      menuSel = (menuSel + (e.key === 'ArrowUp' ? MENU.length - 1 : 1)) % MENU.length
      sound.key()
      return redrawMenu()
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      return void runItem(menuSel)
    }
    if (e.key.length === 1) {
      e.preventDefault()
      onChar(e.key)
    }
    return
  }
  // Tab completes at the shell; on an empty line it still moves focus.
  if (e.key === 'Tab' && mode === 'shell' && input && !e.shiftKey) {
    e.preventDefault()
    sound.key()
    return complete()
  }
  if (e.key === 'Escape' && mode === 'email') {
    e.preventDefault()
    screen.newline()
    out('Cancelled.', Style.Dim)
    return askShell()
  }
  if (e.key === 'Escape' && mode === 'shell') {
    e.preventDefault()
    if (menuInput) {
      // Clear the command line and go back to choosing.
      screen.setInput([])
      input = ''
      mode = 'menu'
      screen.cursor = false
      menuInput = false
    } else if (input) {
      input = ''
      echoInput()
    } else {
      menuHome = true
      endScreen()
    }
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    sound.key()
    void submit()
  } else if (e.key === 'Backspace') {
    e.preventDefault()
    if (input) {
      input = input.slice(0, -1)
      sound.key()
      echoInput()
    }
  } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && mode === 'shell' && recall.length) {
    e.preventDefault()
    recallAt = Math.max(0, Math.min(recall.length, recallAt + (e.key === 'ArrowUp' ? -1 : 1)))
    input = recall[recallAt] ?? ''
    echoInput()
  } else if (e.key.length === 1) {
    e.preventDefault()
    onChar(e.key)
  }
  // Anything else (e.g. 'Unidentified' from Android IMEs) arrives via `input`.
}

addEventListener('keydown', onKey)
addEventListener('keyup', (e) => mode === 'game' && gameKey(e, false))
const keysSheet = document.getElementById('keys') as HTMLDialogElement
// A click on the backdrop (outside the sheet) closes it.
keysSheet.addEventListener('click', (e) => {
  const r = keysSheet.getBoundingClientRect()
  if (e.target === keysSheet && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) keysSheet.close()
})
kbd.addEventListener('input', () => {
  for (const ch of kbd.value) onChar(ch)
  kbd.value = ''
})

/**
 * The terminal cell under a point in the page: canvas pixels are the tube's CSS
 * box scaled, then bent by the same barrel as the shader (no curve without WebGL).
 */
function cellAtPoint(x: number, y: number) {
  const r = tube.getBoundingClientRect()
  const { width, height } = screen.canvas
  const k = width / r.width
  const p = { x: (x - r.left) * k, y: (y - r.top) * k }
  const at = crt.ok ? warp(p.x, p.y, width, height, crt.flat) : p
  return screen.cellAt(at.x, at.y)
}

/**
 * The cell's own row first; on touch, then the neighbouring row the point is
 * nearer to, so each target reaches half a row above and below itself (and
 * the gap rows between menu items belong half to each neighbour).
 */
function nearRows(row: number, fy: number) {
  return coarse ? [row, fy < 0.5 ? row - 1 : row + 1] : [row]
}

function menuItemAt(x: number, y: number): number | null {
  if (mode !== 'menu') return null
  const { row, col, fy } = cellAtPoint(x, y)
  for (const r of nearRows(row, fy)) {
    const line = screen.lineAt(r)
    const hit = menuHits.find((h) => h.line === line && col >= h.from && col < h.to)
    if (hit) return hit.item
  }
  return null
}

/** A tap on "[ yes ]" or "[ no ]" in the last few rows (the current question). */
function ynAt(x: number, y: number): 'y' | 'n' | null {
  if (mode !== 'yn' || !coarse) return null
  const { row, col, fy } = cellAtPoint(x, y)
  // Only the question's own rows: the last few lines with content.
  const shown = Math.min(screen.lines.length, screen.rows)
  for (const r of nearRows(row, fy)) {
    if (r < shown - 4) continue
    const text = screen.textAt(r)
    for (const [label, key] of [[YES, 'y'], [NO, 'n']] as const) {
      const at = text.indexOf(label)
      if (at >= 0 && col >= at && col < at + label.length) return key
    }
  }
  return null
}
// Dev only: hit testing from the console / tests.
if (import.meta.env.DEV) Object.assign(window, { __menuItemAt: menuItemAt, __cellAtPoint: cellAtPoint, __ynAt: ynAt, __crt: crtState, __mode: () => mode, __sound: sound })

/**
 * A press on the screen: a mouse acts on pointerdown, touch on the click that
 * ends the tap. On iOS a new tab opened mid-touch (devcon.org, the archive)
 * left the page waiting for a touch that never ended, and taps stopped working
 * when you came back.
 */
let pressType = ''
tube.addEventListener('pointerdown', (e) => {
  if (mode === 'game') {
    tube.setPointerCapture(e.pointerId)
    return gamePointer(e, 'down')
  }
  pressType = e.pointerType
  if (e.pointerType === 'mouse') press(e.clientX, e.clientY)
})
tube.addEventListener('pointermove', (e) => gamePointer(e, 'move'))
tube.addEventListener('pointerup', (e) => gamePointer(e, 'up'))
tube.addEventListener('pointercancel', (e) => gamePointer(e, 'up'))
tube.addEventListener('click', (e) => {
  if (pressType !== 'mouse') press(e.clientX, e.clientY)
})

function press(x: number, y: number) {
  if (mode === 'off') return requestPower(true)
  if (mode === 'start') return void startBoot()
  if (mode === 'hold') return holdSkip?.()
  // "press any key for the menu": a click or tap counts.
  if (mode === 'more') return endScreen()
  if (mode === 'menu') {
    const item = menuItemAt(x, y)
    if (item !== null && list === 'past') openPast(item)
    else if (item !== null) (menuSel = item), void runItem(item)
  } else if (mode === 'yn') {
    // A tap on [ yes ] or [ no ] is the whole answer.
    const key = ynAt(x, y)
    if (key) onChar(key), void submit()
  }
}

// Back from a tab a menu item opened: straight to the menu, no tap needed.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && mode === 'more') endScreen()
})

// Raise the keyboard only for steps that need typing (the email prompt, the
// shell), never for menu taps. On click rather than pointerdown: the pointer's
// own mousedown would move focus back off the input; click is still inside the
// gesture, which phones need to show the keyboard.
tube.addEventListener('click', () => {
  if (mode === 'email' || mode === 'shell') kbd.focus({ preventScroll: true })
})

// Desktop: hovering a menu row highlights it (the keyboard highlight follows).
tube.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || mode === 'game') return
  if (mode === 'start') {
    const on = onStartBox(e.clientX, e.clientY)
    tube.style.cursor = on ? 'pointer' : ''
    if (on !== startHover) (startHover = on), drawStart()
    return
  }
  const item = menuItemAt(e.clientX, e.clientY)
  tube.style.cursor = item === null ? '' : 'pointer'
  if (item !== null && list === 'past' && item !== pastSel) {
    pastSel = item
    redrawMenu()
  } else if (item !== null && list === 'menu' && item !== menuSel) {
    menuSel = item
    redrawMenu()
  }
})
tube.addEventListener('pointerleave', () => (tube.style.cursor = ''))

powerBtn.addEventListener('click', pressPower)

skipBtn.addEventListener('click', onSkipKey)

function setMuted(m: boolean) {
  sound.setMuted(m)
  soundBtn.setAttribute('aria-pressed', String(!m))
  try {
    localStorage.setItem('devcon-tty-muted', m ? '1' : '0')
  } catch {}
}
soundBtn.addEventListener('click', () => setMuted(!sound.muted))
try {
  if (localStorage.getItem('devcon-tty-muted') === '1') setMuted(true)
} catch {}
/** The phosphor colour someone picked (`color`, C), if any: it wins over a skin's default. */
function savedColor() {
  try {
    const c = localStorage.getItem('devcon-tty-color')
    return c && c in PHOSPHOR ? (c as keyof typeof PHOSPHOR) : null
  } catch {
    return null
  }
}
if (savedColor()) crtState.tint = [...PHOSPHOR[savedColor()!]]

const srForm = $<HTMLFormElement>('#sr-form')
const srStatus = $<HTMLParagraphElement>('#sr-status')

// The HTML mirror of the menu, for screen readers and keyboard users. Its
// items are the canvas menu's, in order (without "Open the shell").
const srMain = $<HTMLElement>('main')
const srItems = [...document.querySelectorAll<HTMLElement>('main nav > ul > li > :first-child')]
const srJoin = $<HTMLButtonElement>('#sr-join')
function syncSrMenu() {
  srJoin.textContent = joinLabel()
}
syncSrMenu()
srJoin.addEventListener('click', () => {
  // After a signup the form is hidden with its button disabled: bring it back usable.
  if (srForm.hidden) {
    srForm.hidden = false
    srForm.querySelector('button')!.disabled = false
    srStatus.textContent = ''
  }
  $<HTMLInputElement>('#sr-email').focus()
})
// About and Past Devcons are disclosures: the button shows or hides its section.
for (const button of document.querySelectorAll<HTMLButtonElement>('main nav button[aria-controls]')) {
  const section = document.getElementById(button.getAttribute('aria-controls')!)!
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true'
    button.setAttribute('aria-expanded', String(open))
    section.hidden = !open
    // The same output on the canvas, for anyone watching it.
    if (open && (mode === 'menu' || mode === 'more')) void runItem(srItems.indexOf(button))
    else if (!open && (mode === 'more' || (mode === 'menu' && list === 'past'))) endScreen()
  })
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
// Each past edition links to its talks on the archive.
$<HTMLElement>('#sr-history ul').append(
  ...[...HISTORY, { name: EVENT.city, year: YEAR, hook: '', archive: null }].map(({ name, year, hook, archive }, i) => {
    const li = document.createElement('li')
    const label = `Devcon ${i}: ${name}, ${year}`
    const after = hook ? `. ${hook}` : ''
    if (archive) li.append(Object.assign(document.createElement('a'), { href: archive, target: '_blank', rel: 'noopener', textContent: `${label} (watch the talks)` }), after)
    else li.textContent = label + after + (i < HISTORY.length ? ' (no talks yet)' : '')
    return li
  }),
)
srForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const button = srForm.querySelector('button')!
  button.disabled = true
  srStatus.textContent = ''
  const res = await submitWaitlist($<HTMLInputElement>('#sr-email').value.trim(), 'sr-form')
  if (res.ok) {
    syncSrMenu()
    srForm.hidden = true
    srStatus.textContent = `You're on the list. See you in ${EVENT.city}.`
    // Land keyboard and screen-reader users on the confirmation.
    srStatus.tabIndex = -1
    srStatus.focus()
  } else {
    srStatus.textContent = "Couldn't reach the waitlist. Please try again."
    button.disabled = false
  }
})

// Sighted keyboard users Tab through the mirror too, so the canvas shows where
// focus is: a menu item lights its row (as ↑↓ or hover would), and the form
// shows as a small panel above the chin.
let selBeforeMirror: number | null = null

/** Bring the end screen up from wherever the terminal is. */
function toMenu() {
  if (mode === 'off') {
    requestPower(true)
    void transition.then(() => mode === 'start' && srItems.includes(document.activeElement as HTMLElement) && toMenu())
  }
  else if (mode === 'start') void startBoot(false), skip()
  else if (mode === 'boot') skip()
  else if (mode === 'hold') holdSkip?.()
  else if (mode === 'more' || mode === 'yn' || mode === 'email' || mode === 'shell') (menuHome = true), endScreen()
}

function syncPanel(focused: EventTarget | null) {
  const el = focused as Node | null
  srMain.classList.toggle('show-form', !!el && (srForm.contains(el) || el === srStatus))
}

srMain.addEventListener('focusin', (e) => {
  syncPanel(e.target)
  const i = srItems.indexOf(e.target as HTMLElement)
  if (i < 0) return
  selBeforeMirror ??= menuSel
  menuSel = i
  if (mode === 'menu') list === 'past' ? endScreen() : redrawMenu()
  else toMenu()
})
srMain.addEventListener('focusout', (e) => {
  syncPanel(e.relatedTarget)
  if (srItems.includes(e.relatedTarget as HTMLElement) || selBeforeMirror === null) return
  menuSel = selBeforeMirror
  selBeforeMirror = null
  if (mode === 'menu') redrawMenu()
})
// Space activates the links too, like the buttons beside them.
for (const a of srItems.filter((el) => el instanceof HTMLAnchorElement)) {
  a.addEventListener('keydown', (e) => {
    if (e.key !== ' ') return
    e.preventDefault()
    a.click()
  })
}

// ---------------------------------------------------------------------------
// Power

// The backdrop round the monitor picks up the screen's light: one CSS variable,
// set when the power or the phosphor colour changes (CSS fades and flickers it).
function setGlow(on: boolean) {
  const [r, g, b] = crtState.tint.map((v) => Math.round(v * 255))
  document.documentElement.style.setProperty('--glow', on ? `rgb(${r} ${g} ${b})` : 'rgb(0 0 0 / 0)')
  // The phosphor colour itself, for the form panel.
  document.documentElement.style.setProperty('--phosphor', `rgb(${r} ${g} ${b})`)
  backgroundsSetGlow([...crtState.tint], on ? 1 : 0)
}

// The tab title names the city, so it waits for the reveal like the screen
// does. The HTML <title> keeps the full one for sharing and search.
const PAGE_TITLE = document.title
// Before the city is found (start screen, off, booting) the tab keeps the secret.
const SHORT_TITLE = EVENT.name
function setTitle(t: string) {
  document.title = t
}

function skip() {
  if (mode !== 'boot' || skipping) return
  skipping = true
  sound.quiet = true
  wakeAll()
}

/** Light the tube at once: the page opens with the monitor already on. */
function lightUp() {
  crtState.on = 1
  crtState.bright = 1
  crtState.squashX = 1
  crtState.squashY = 1
  crtState.flash = 0
  crtState.wobble = 0
}

// Power is a small state machine. A press during a transition never starts a
// second, overlapping one: the last press wins, and once the transition ends
// the monitor goes on to the wished-for state if it differs (one follow-up).
// Each transition cancels the previous run (its waits via `generation`, the
// boot script with them, and the tube's tweens).
type Power = 'off' | 'poweringOn' | 'on' | 'poweringOff'
let power: Power = 'on'
let wantOn = true
// Settles when the transition under way (if any) and its follow-up finish.
let transition: Promise<void> = Promise.resolve()

/** The power button: flip what the user wants. */
function pressPower() {
  requestPower(!wantOn)
}

/** Ask for on or off: now if idle, else when the current transition ends. */
function requestPower(on: boolean) {
  wantOn = on
  if ((power === 'off' && on) || (power === 'on' && !on)) transition = on ? powerOn() : powerOff()
}

/** A transition has ended: the follow-up to the wished-for state, if it differs. */
function settlePower(): Promise<void> | undefined {
  if (wantOn !== (power === 'on')) return wantOn ? powerOn() : powerOff()
}

/** The power-on animation, then the start screen. */
async function powerOn() {
  power = 'poweringOn'
  const gen = ++generation
  wakeAll()
  stopTweens()
  clearInterval(startBlink)
  mode = 'busy'
  setGlow(true)
  setState('booting')
  sound.start()
  sound.powerOn()
  screen.clear()
  tube.classList.remove('smoking')

  // A white-hot line that snaps open into a raster, then the degauss wobble
  // and a slow warm-up as the phosphor comes to full brightness.
  crtState.on = 1
  crtState.bright = 0.55
  crtState.squashX = 1
  crtState.squashY = 0.004
  crtState.flash = 1.4
  crtState.wobble = 1
  await tween(crtState, 'squashY', 1, reduced ? 1 : T.beam, easeOut)
  if (gen !== generation) return
  void tween(crtState, 'flash', 0, T.flash)
  void tween(crtState, 'wobble', 0, T.wobble)
  void tween(crtState, 'bright', 1, T.warmUp, (x) => 1 - (1 - x) ** 2)
  power = 'on'
  if (autoBoot) {
    autoBoot = false
    menuHome = false
    void bootSequence(false)
  } else showStart()
  return settlePower()
}

// ---------------------------------------------------------------------------
// Start screen: the DEVCON wordmark and a "Press ENTER to start" box. The first
// gesture here is also the first moment the browser lets us play sound.

let startLines: object[] = []
let startFrom = 0
let startTo = 0
let startHover = false
let startLit = true
let startBlink = 0

function showStart() {
  mode = 'start'
  setState('on')
  setTitle(SHORT_TITLE)
  startHover = false
  startLit = true
  clearInterval(startBlink)
  if (!reduced) {
    startBlink = window.setInterval(() => {
      startLit = !startLit
      if (mode === 'start') drawStart()
    }, 650)
  }
  drawStart()
}

function drawStart() {
  screen.clear()
  screen.cursor = false
  const mark = W() >= TITLE_WIDE[0].length + 2 ? TITLE_WIDE : TITLE_NARROW
  const label = coarse ? 'Tap to start' : 'Press ENTER to start'
  const inner = `  ▶  ${label}  `
  const boxW = inner.length + 2
  const top = Math.max(0, Math.floor((room() - (mark.length + 1 + 3)) / 2))
  for (let i = 0; i < top; i++) out()
  const markPad = ' '.repeat(centred(Math.max(...mark.map((l) => l.length))))
  for (const l of mark) screen.setLine(shaded(l, markPad)), screen.newline()
  out()
  const pad = ' '.repeat(centred(boxW))
  const frame = startHover ? Style.Bright : Style.Dim
  // The ▶ pulses; hovering the box inverts it, like a menu row.
  const body: Row = startHover
    ? [[inner, Style.Inverse]]
    : [['  '], ['▶', startLit ? Style.Bright : Style.Dim], [`  ${label}  `, Style.Bright]]
  startLines = []
  for (const row of [
    [[pad + '┌' + '─'.repeat(inner.length) + '┐', frame]],
    [[pad + '│', frame], ...body, ['│', frame]],
    [[pad + '└' + '─'.repeat(inner.length) + '┘', frame]],
  ] as Row[]) {
    screen.setLine(row)
    startLines.push(screen.mark())
    screen.newline()
  }
  startFrom = pad.length
  startTo = pad.length + boxW
}

/** Whether a point is on the start box. */
function onStartBox(x: number, y: number) {
  if (mode !== 'start') return false
  const { row, col } = cellAtPoint(x, y)
  return startLines.includes(screen.lineAt(row)!) && col >= startFrom && col < startTo
}

/** From the start screen: the first sound (the relay clunk and degauss), then the boot. */
async function startBoot(withSound = true) {
  if (mode !== 'start') return
  return bootSequence(withSound)
}

/** From the end screen, menu or shell: the whole boot again from the BIOS. */
async function replay() {
  delete document.body.dataset.found
  backgroundsReset()
  menuHome = false
  return bootSequence(true)
}

async function bootSequence(withSound: boolean) {
  clearInterval(startBlink)
  tube.style.cursor = ''
  generation++
  mode = 'boot'
  sessions.length = 0
  host = 'devcon'
  cwd = '~'
  setTitle(`${EVENT.name} · booting...`)
  setGlow(true)
  skipping = false
  sound.quiet = false
  setState('booting')
  if (withSound) {
    sound.start()
    sound.powerOn()
    // The degauss wobble, as the tube is already warm.
    crtState.wobble = 1
    void tween(crtState, 'wobble', 0, T.wobble)
  }
  screen.clear()
  screen.cursor = true
  performance.mark('boot:power')

  try {
    await bios()
    while (fried) {
      await noSystem()
      await reinstall()
      await bios()
    }
    await kernel()
    await login()
    await run()
    // Esc (or ?skip) fast-forwards: the reveal then draws at once, and the
    // end screen is the same either way.
    await lisbon()
    skipping = false
    sound.quiet = false
    setState('on')
    // The machine has arrived.
    host = EVENT.host
    performance.mark('boot:menu')
    menuHome = true
    endScreen()
  } catch (e) {
    if (e !== ABORT) throw e
  }
}

/** The raster collapses to a line, then a dot, then off. */
async function powerOff() {
  power = 'poweringOff'
  const gen = ++generation
  wakeAll()
  stopTweens()
  clearInterval(startBlink)
  setGlow(false)
  mode = 'busy'
  setState('booting')
  sound.powerOff()
  crtState.flash = 0
  void tween(crtState, 'flash', 0.9, 160)
  for (const step of [
    () => tween(crtState, 'squashY', 0.006, 200, easeIn),
    () => tween(crtState, 'squashX', 0.004, 220, easeIn),
    () => tween(crtState, 'flash', 0, 450),
  ]) {
    await step()
    if (gen !== generation) return
  }
  // Everything off follows from here, whatever happened on the way.
  screen.clear()
  crtState.on = 0
  crtState.bright = 0
  crtState.squashX = 1
  crtState.squashY = 1
  crtState.flash = 0
  crtState.wobble = 0
  power = 'off'
  mode = 'off'
  setState('off')
  setTitle(SHORT_TITLE)
  setGlow(false)
  delete document.body.dataset.found
  backgroundsReset()
  // A reboot (or a press while it powered off) comes back on after a beat.
  if (wantOn) {
    // Cut short (ABORT) if a key or tap powers it on meanwhile.
    await wait(350).catch(() => {})
    if (gen !== generation) return
  }
  return settlePower()
}

// ---------------------------------------------------------------------------


// The backgrounds behind the monitor (switching is an easter egg: A/D, `bg`),
// and the monitor's skin (another: W/S, `skin`). Each skin has its own default
// phosphor (white on the white one, green elsewhere) unless one was picked.
initBackgrounds({ monitor: $<HTMLElement>('.monitor'), reduced })
initSkins((id) => {
  if (savedColor()) return
  crtState.tint = [...PHOSPHOR[id === 'white' ? 'white' : 'green']]
  if (document.body.dataset.state && document.body.dataset.state !== 'off') setGlow(true)
})

void document.fonts.load('32px VT323').then(() => {
  resize()
  new ResizeObserver(resize).observe(tube)
  requestAnimationFrame(frame)
  // The monitor is already on: lit, silent (no gesture yet), on the start screen.
  lightUp()
  setGlow(true)
  showStart()
  // Deep link straight to the end screen, for review: ?skip
  if (new URLSearchParams(location.search).has('skip')) {
    void startBoot(false)
    skip()
  }
})
