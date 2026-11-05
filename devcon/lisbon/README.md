# Devcon IX Lisbon — announcement page

The Devcon IX announcement, served by devcon.org at **`/lisbon/`**: a graphite CRT floating on a dark gradient that boots, searches for the next venue, reveals Lisbon and ends on a menu with the waitlist. Brought in from [Scott1UP/devcon-ix](https://github.com/Scott1UP/devcon-ix) (terminal concept only; the plain-HTML and Web 1.0 concepts stayed there).

> **Devcon IX Lisbon** · CCL – Lisbon Congress Centre · Lisbon, Portugal · 11–13 October 2027 · _Join the waitlist_

## How it fits in devcon.org

A static Vite site inside the `devcon` package, not a Next page: no framework, its own `tsconfig.json`, and its dependencies (`vite`, `esbuild`, `@fontsource/vt323`) in `devcon/package.json`.

```sh
# from devcon/
pnpm dev:lisbon      # Vite dev server, http://localhost:5173/lisbon/
pnpm build:lisbon    # tsc --noEmit, then vite build → public/lisbon/ (gitignored)
pnpm build           # runs build:lisbon first, then the Next build
```

- `vite.config.ts` sets `base: '/lisbon/'` and `outDir: ../public/lisbon`. Next serves that folder as static files, but does not resolve a directory to its `index.html`, so `src/middleware.ts` rewrites `/lisbon/` to `/lisbon/index.html` (one hop, no locale redirect; `/en/lisbon/` and the other locale prefixes redirect to `/lisbon/`, so there is one URL and nothing to translate). It has to be the middleware: with i18n on, Next matches `next.config.js` rewrites against the locale-prefixed path, so a config rewrite for `/lisbon/` never fires.
- Asset URLs built in code use `import.meta.env.BASE_URL` (`skins.ts`, `backgrounds/stickerWall.ts`); the inline script in `index.html` uses the `{{SITE.base}}` placeholder. Vite rewrites the rest (HTML `href`/`src`, CSS `url()`).
- `netlify.toml` (devcon) gives `/lisbon/assets/*` an immutable cache header; the global `frame-ancestors 'self'` from `next.config.js` covers the page.
- `VITE_*` variables are read from devcon's `.env` files (`envDir` is the package root), so there is no second `.env` here.
- To run it locally through Next (`pnpm dev` on the devcon site), build it once with `pnpm build:lisbon`; Next serves whatever is in `public/lisbon/`.

Review shortcuts: `/lisbon/?skip` (straight to the end screen), `?bg=1|2|3|4|5|6|7` (a background scene), `?skin=1|2|3|4` (graphite (the default), retro, white or pastel).

## Tech stack

- **Vite 8** builds it. A small inline plugin fills event-fact placeholders into the HTML at build time.
- **TypeScript** in strict mode (devcon's compiler, its own `tsconfig.json`). The build runs a typecheck first, so a type error fails it.
- **No framework.** Plain DOM code. The terminal is a Canvas 2D text grid with a single WebGL shader pass for the CRT look, and WebAudio for synthesised sound.
- **CSS only** for the monitor case, the four skins, the wear and the retro TV. One photo asset for the retro skin on desktop.
- **Font** VT323, self-hosted through Fontsource.

In detail:

| Layer | What | Where |
| --- | --- | --- |
| Build | **Vite 8**, one page (`index.html`). A tiny inline plugin fills `{{EVENT.*}}`, `{{META.*}}`, `{{LINKS.*}}`, `{{SITE.url}}` and `{{SITE.base}}` in the HTML at build time and fails the build on an unfilled placeholder. CSS is minified with esbuild. | `vite.config.ts` |
| Language | **TypeScript**, `strict`, ES2022, bundler resolution. `pnpm build:lisbon` runs `tsc --noEmit` before `vite build`, so a type error fails the build. | `tsconfig.json` |
| Terminal text | A **Canvas 2D** character grid (rows × columns of styled cells, a cursor, word wrap) rendered from the script in `main.ts`. | `src/terminal/screen.ts` |
| CRT | One **WebGL** fragment pass over that canvas: barrel curvature, bloom, scanlines, aperture grille, chromatic fringe, rolling bar, flicker, noise, phosphor persistence, the fry sequence. Taps are mapped through the same `warp` as the shader. Drops to ~10 fps after 20 s idle. | `src/terminal/crt.ts` |
| Sound | **WebAudio**, synthesised one-shots only (no samples): relay clunk, degauss, seeks, key clicks, beep, power-off zap, the fry. Unlocked by the first gesture. | `src/terminal/audio.ts` |
| Case, skins, wear | **CSS** only, with inline SVG for grain, scratches and stains: the glass, bezel and chin, four monitor skins (`html[data-skin]`), graphite wear, the retro TV. The retro photo frame on desktop is the one image asset for a skin. Skin switches use the View Transitions API where supported. | `src/terminal/terminal.css`, `src/terminal/skins.ts` |
| Backgrounds | Seven scenes behind the monitor: a CSS gradient, three seeded procedural canvases (pixel art, a Y2K metaball field) and three sticker walls of positioned `<img>`s. | `src/terminal/backgrounds/` |
| Lettering | The Devcon diamond rasterised into character cells from the official mark's geometry; DEVCON IX and LISBON in figlet's **ANSI Shadow** (the alphabet is checked in). | `src/terminal/logo.ts` |
| Font | **VT323**, self-hosted via Fontsource. | `@fontsource/vt323` |
| Facts and metadata | One `EVENT` / `LINKS` / `META` constant drives the script, the title, Open Graph and Twitter tags, the canonical URL and the `<noscript>` copy. | `src/terminal/event.ts` |
| Waitlist | `fetch` to `VITE_WAITLIST_ENDPOINT`; without it, every signup fails (see below). 10 s timeout, 2xx only counts as success. | `src/terminal/waitlist.ts` |

## Features at a glance

Each of these is described in full under [The terminal](#the-terminal).

- **A keyed-secret reveal.** Start screen → BIOS, LILO, kernel log, `./devcon` → a city search that fails through Madrid, Tokyo, Sydney… → Lisbon's `[  OK  ]` → an original ASCII drawing of the 25 de Abril bridge → the end screen. ~21 s; Esc or the chin's skip key skips it, `?skip` jumps to the end. The tab title keeps the secret until the city is found.
- **A numbered menu** on the end screen: waitlist, about, past Devcons, archive, devcon.org, privacy, code of conduct, shell. Digits, arrows + Enter, click or tap.
- **A real waitlist** that only reports success on a 2xx, remembers that you joined, and has a screen-reader form.
- **Past Devcons** as a browsable list, each edition linking to its talks on the archive.
- **A shell** with Tab completion, history recall, `help`, `history`, `man devcon`, `sudo`, `uname -a`, `color`, `sound`, `bg`, `skin`, `reboot`, `exit` and more; `rm -rf /` fries the machine and makes it reinstall itself (the broken state survives a reload).
- **Chin controls:** power (with a real state machine and an amber standby LED), skip/replay, sound, and the Devcon logo.
- **Four monitor skins** (graphite, retro, white, pastel; W/S or `?skin=`), with graphite wear and a photographed retro TV on desktop.
- **Seven backgrounds** (dark, night room, Lisbon sunset, Y2K, sticker wall, sticker wall at night, studio; A/D or `?bg=`), the Lisbon ones reacting to the reveal. Click the sticker walls to stamp stickers.
- **Three phosphor colours** (green, amber, white; C or `color`), remembered.
- **A `?` shortcut sheet** as a native `<dialog>`.
- **Phones and touch:** bigger type, two-row tap targets, a flatter tube, taps mapped through the shader's curve, layouts for short landscape screens.
- **Accessibility:** `aria-hidden` canvas with a visually hidden HTML mirror of the menu and form, `role="status"` results, `<noscript>` facts and links, and reduced-motion variants of every animation (faster boot, no wobble/flicker/smoke, still backgrounds).
- **Sharing:** title, description, Open Graph, Twitter card, canonical URL and `og.png` all derived from the event facts.

### Environment

Read from the devcon package's `.env` files (`.env`, `.env.local`, …) or the Netlify environment.

| Variable | What |
| --- | --- |
| `VITE_WAITLIST_ENDPOINT` | Optional. If set, waitlist signups are POSTed here as JSON `{ email, source, ts }` (`source` is `terminal` or `sr-form`; `ts` an ISO timestamp); any 2xx counts as success. If unset, nothing is sent and every signup shows the failure message. |
| `VITE_SITE_URL` | Absolute site origin, no trailing slash, used for `og:url`, `og:image` and `<link rel="canonical">` (all under `/lisbon/`). Defaults to `https://devcon.org`. |

### Waitlist

Both the terminal (menu item 1, or `waitlist` in the shell) and the screen-reader form call `submitWaitlist()` in `src/terminal/waitlist.ts`. It only reports success when the request returns 2xx; network errors, other statuses and a 10 s timeout show a failure message instead. On success the browser remembers it (`localStorage` `devcon-ix-joined=1`): item 1 then reads "You're on the list (joined)" and offers `Use a different address? [y/N]` (`waitlist --again` skips the question).

**The backend is not decided yet.** With no `VITE_WAITLIST_ENDPOINT` the function returns a failure without sending anything, so the page never claims a signup it did not make. The original repo posted to Netlify Forms; that path was removed here because the devcon site runs on the Next.js Netlify runtime, where Forms needs a POST to a static HTML file and form detection enabled on the site. Either bring that back on those terms, or point `VITE_WAITLIST_ENDPOINT` at an API route.

Event facts and links live in `EVENT` / `LINKS` / `META` in `src/terminal/event.ts`. Title, description and sharing copy are built from them; `vite.config.ts` fills the `{{EVENT.*}}`, `{{META.*}}`, `{{SITE.url}}` and `{{SITE.base}}` placeholders in the HTML at build time.

## Before launch

- [ ] Privacy copy and notice signed off (waitlist, storage provider, unsubscribe)
- [ ] Waitlist backend chosen and `VITE_WAITLIST_ENDPOINT` set
- [ ] Event dates and venue confirmed (`EVENT` in `src/terminal/event.ts`)
- [ ] The `history -v` hooks fact-checked

## The terminal

**The flow** (~21 s to the menu; the chin's skip key or Esc skips it, `?skip` goes straight to the end):

1. **Start screen.** The page opens with the monitor already on (silent: browsers block audio before a gesture), showing DEVCON IX (on one line in ANSI Shadow, or stacked in the pixel font on narrow screens) and "▶ Press ENTER to start" ("Tap to start" on touch). The tab reads "Devcon IX" until the city is found.
2. **Boot.** Enter, a click or a tap plays the first sound (relay clunk, degauss) and runs: BIOS POST → LILO → a short Linux 2.0 kernel log → init `[  OK  ]` steps → `devcon login: guest` → `./devcon` (peer discovery, a replay of every past Devcon, the ninth as `??????`). Nothing names the city.
3. **City search.** `devcon: locating next venue` tries Madrid, Tokyo, Sydney… each `[FAILED]`, until Lisbon's dots creep out and `[  OK  ]` lands with a beep (list and timings in `CITY_SEARCH`). The tab title becomes the full one.
4. **Reveal.** An original ASCII drawing of the 25 de Abril bridge and the castle hill, LISBON in big letters, Portugal, "Grilling sardines" / "Warming pastéis de nata", when / where; it holds 4 s (any key moves on). The centre of the backdrop warms slightly.
5. **End screen.** The Devcon diamond and wordmark, "IX · Lisbon · 11–13 October 2027", the drawing beside a numbered menu: join the waitlist, about, past Devcons, the archive, devcon.org, privacy, code of conduct, open the shell. Digits, ↑↓ + Enter, click or tap; touch rows are spaced out for bigger targets.

**Shell.** `help` lists the main commands (waitlist, privacy, about, history, mail, devcon.org, archive, coc, contact, color, sound, clear, reboot, exit); there are more (`history -v | --all | <n>`, `sponsor`, `sudo`, `man devcon`, `uname -a`…). Tab completes command names, ↑↓ recalls history, `menu` or Esc on an empty line returns to the menu. `color` and `sound` are remembered.

**Past Devcons.** Menu item 3 opens the editions as a list of their own: ↑↓ + Enter, a number (0–8), a click or a tap opens that edition's talks on the archive in a new tab (`https://archive.devcon.org/watch/?event=devcon-<n>`, the archive's per-event filter; `archive` in each `HISTORY` entry in `main.ts`). Editions with no talks there yet (Mumbai, `archive: null`) are dim, marked "(no talks yet)" and do nothing; Esc or the last row ("Back to the menu", lined up with the city names; no arrow, since ← switches the background) returns. In the shell, `history <n>` prints an edition with its archive URL, and `history open <n>` or `archive <n>` opens it. The screen-reader list links each edition too.

**Short screens.** On touch the menu (and the Past Devcons list) puts a blank line between rows for bigger targets, but only when the screen has the rows for it. A phone on its side has 12–16 rows, so the rows stay together there, and if the usual end screen still won't fit, the facts ("DEVCON IX", city and dates, venue) sit beside the menu box instead of above it.

**Phones.** On touch the type is at least 22 CSS px (17 px with a mouse), so menu rows are 23.5 px and, with the blank lines, each tap target is about 47 px; the floor gives way only to keep 32 columns. Screens up to 640 px wide get a flatter tube (`tubeShape` in `crt.ts`): a third of the desktop curve, a narrow shading band at the glass edge, half the unlit margin, a faint vignette and slightly less bloom, so text near the sides stays at full brightness; the grid uses 94 % of the tube instead of 88–90 %. Taps are mapped through the same curve as the shader (`warp`), so they land on the row they appear to. Touch acts on the click that ends a tap, not on touch-down: on iOS a link opened mid-touch left the page unresponsive when you came back. After an item opens a new tab, the hint reads "tap for the menu", and coming back to the page goes straight to the menu. At 320×568 the menu loses its blank lines (19 rows), and the Mumbai row says "(no talks)".

**Chin.** Power (off shows the amber standby LED; on returns to the start screen), a skip/replay key (skip-forward skips the intro; at the end screen a circular arrow replays it from the BIOS), Sound, and the Devcon logo. The power, skip and replay icons are inline SVGs from [Lucide](https://lucide.dev) (`power`, `skip-forward`, `rotate-ccw`) in `currentColor`, so they take the label colour and the dimmed and disabled states.

**`rm -rf /` (an easter egg).** In the shell, `rm -rf /` (also with `sudo`, `--no-preserve-root`, `/*`, split or long flags, or `rf` for `rm`) fries the machine: drive thrash, `/proc` refusing to go, a kernel Oops and `Kernel panic: Attempted to kill init!`, then the tube arcs (text corrupts, the picture swims; brightness only sags, no strobing), bangs, collapses to a dot and smokes. Once the smoke clears it powers itself back on (a press gets there sooner) into the BIOS, LILO stops at `L 01 01 ...`, `DISK BOOT FAILURE`, it falls back to the CD-ROM, reinstalls Devcon/Linux and reboots into the normal boot (Esc skips as usual). The broken state is kept in `localStorage` (`devcon-tty-fried=1`), so a reload stays broken until the reinstall finishes. Smoke is hidden under reduced motion.

**Accessibility.** The canvas is `aria-hidden`; a visually hidden `<main>` mirrors the menu as real links and buttons, with the waitlist form, a privacy note and a `role="status"` result. The `<noscript>` copy has the facts and links.

**CRT and sound.** Barrel curvature, bloom, scanlines, aperture grille, chromatic fringe, rolling bar, flicker, noise and phosphor persistence in one WebGL pass; the glass, bezel and case are CSS. After 20 s without input the shader drops to ~10 fps. Sound is synthesised WebAudio one-shots (clunk, degauss, seeks, key clicks, beep, power-off zap), no background hum. Reduced motion speeds up the boot and turns off wobble, flicker, pulses and fades.

**Backdrop.** A radial gradient centred a little above the monitor, dark grey (#2a2a2a) to near-black (#0a0a0a), under a faint static grain so it never bands. The case floats with a soft dark shadow below and a faint lighter rim so the graphite separates from the ground; a soft halo round it takes the phosphor colour (`--glow`). From Lisbon's `[  OK  ]` the centre warms slightly. `theme-color` is #0a0a0a.

**Backgrounds (an easter egg).** `src/terminal/backgrounds/` holds seven scenes: 1 · Dark (the gradient above), 2 · Night room (an animated pixel-art room over a generic dusk skyline), 3 · Lisbon sunset (pixel art that reveals the bridge, a tram and azulejos when Lisbon's `[  OK  ]` lands), 4 · Y2K, 5 · Sticker wall (the default), 6 · Sticker wall (night) and 7 · Studio (all below). Nothing on screen points to them: A/D switch scenes on the menu or start screen (←/→ too, anywhere text isn't being typed), with a 400 ms crossfade; a small dim toast ("2/3 · Night room", aria-hidden) names the scene; every visit starts on the sticker wall, scene 5 (a pick isn't remembered), and a `?bg=1|2|3|4|5|6|7` link opens a scene (switching away drops it from the URL). For the curious: `ls -a` shows `.backgrounds` (`cat` it for the hint), and the hidden `bg` command lists the scenes or switches (`bg 2`). The pixel scenes are drawn in code on a 180-row canvas from a fixed seed, at most 12 fps, paused in hidden tabs, slower when idle, a still frame under reduced motion; hidden at ≤ 640px.

**Y2K (scene 4).** An original nod to millennium CGI (c. 1997–2004), smooth rather than pixel art: a canvas at the viewport's size (DPR capped at 1.5) with a pale icy field, a faint lens band and a perspective grid to a low horizon, and chrome metaballs drifting in the margins beside the monitor (never behind it), merging when they touch, on a seamless 15 s loop at ≤ 15 fps, with a light sweep every 7.5 s and a few translucent lime accents. The metaballs are summed per pixel (f = Σ r²/d², surface at f ≥ 1) on a third-resolution buffer, only inside the blobs' bounding boxes, shaded by their normal against a fake chrome environment (dark blue-grey above, white at the horizon, sky blue below) and scaled up smoothly. When Lisbon's `[  OK  ]` lands the accents warm to sunset orange over 2 s and one blob stretches briefly into a slim arch; power-off and reboot undo it. The graphite case gets a cool reflection on its top edge and a lighter, softer shadow there, the screen's halo is ice-white instead of the phosphor colour, and the field darkens round the monitor so the text stays the brightest thing. Seeded, so it's the same every visit; a still frame under reduced motion.

**Sticker wall (scene 5, a test).** The past Devcons' stickers on a pastel sky taken from the DC7 Deva artwork (CSS: a vertical gradient from cyan #a9deec through lavender #cecdee to pink #f3caeb, a faint warm glow at the bottom, and a fine coloured grain from SVG noise blended with overlay), round the monitor: never behind the screen, though two are tucked a few px behind the case's sides. Deva (the running one, DC7) sits small on the graphite chin, midway between the controls and the logo. Plain positioned `<img>`s, no per-frame drawing: 10 WebPs in `public/backgrounds/stickers/` (one die-cut sticker per Devcon, 0–8, with its own white edge and soft shadow, stray specks cleared, trimmed to 600 px wide; plus the Devas at up to 600 px; the source PNGs stay in `docs/stickers/`, out of the build), requested only when the scene is shown (not at all on phones). The layout is seeded (the same for the same window) and redone on resize: tilts of ±14°, 90–220 px wide, the long wordmarks at least 30 px tall (smaller all round when the wall is small), biggest first towards the corners, a little overlap allowed, Devcon 8 near the top; a sticker that can't fit at 80 px is left off (`data-missing` on `.bg-wall` lists them). The look is CSS: a drop shadow, a 1 px grey cut edge, a faint sheen. Seeded wear, leaning on the older editions: three peeled corners (the corner cut off along a fold and mirrored back over the face, its light underside shaded at the bend), two scuffs, two faded; Devcon 8 stays fresh. The sky is light, so the green halo and the Lisbon warm-up stay off; nothing happens at Lisbon (yet). The wall follows the mouse by 2.5 px (not on touch, not under reduced motion).

**Stamping stickers (scenes 5–7).** On any sticker wall a mouse click off the monitor (on the wall itself, not the screen, the case or a control) stamps a random sticker centred where it lands, pressed on with a quick 0.2 s scale-down (none under reduced motion): random tilt and size, fresh (no wear), on top of the others and behind the monitor. It picks from the wall's nine Devcon stickers plus a stash of three that are never on the wall to begin with (Deva's head from DC7, the Bogotá Deva and the running Deva, die-cut with a white edge: `deva-*.webp`, the stash ones fetched only when first stamped). Repeats allowed, as many as you like (the oldest go past 400); a resize keeps them, switching scene or reloading clears them. Nothing points to it.

**Sticker wall at night (scene 6) and the Pastel skin (skin 4).** The sticker wall inverted: scene 6 is the same wall on a dark diagonal gradient with a faint cool grain, and unlike scene 5 it's new every time it's shown (a load, or switching back to it): a random seed re-rolls the stickers' places, tilts, sizes and wear, and the gradient runs from a deep blue-to-violet to a near-black at a random diagonal, about a third of the time through a dark third colour (teal to magenta); a resize keeps the wall it has. It has the screen's halo and the Lisbon warm-up back on; skin 4 is the graphite monitor's shape in the wall's pastel sky, as a diagonal gradient (cyan, lavender, pink, a touch of peach at the bottom right) under the same overlay grain, with fine dark and light hairline scratches, a violet recess round the tube, light keys and a light power button with navy labels (`html[data-skin='pastel']` in `terminal.css`, CSS only, no images). They're independent like the other skins and scenes; together: `?bg=6&skin=4`.

**Graphite wear.** The default case looks used, not dirty: hairline scratches on the bezel, chin and top surface, the moulding faintly uneven, a little dust in the recess's corners, a fingerprint just past the controls and key tops a shade glossier in the middle. All CSS with inline SVG, static and very low contrast, scoped to `html[data-skin='graphite']` ("Graphite wear" in `terminal.css`).

**Skins (the secret easter egg).** `src/terminal/skins.ts` holds four monitor skins: 1 · Graphite (the default), 2 · Retro, 3 · White and 4 · Pastel (below). Nothing points to the switch: it's left out of the `?` sheet and `ls -a`. Retro is a worn, yellowed 70s TV with the same screen size, floating on the backdrop like the graphite monitor and filling the screen on phones (screen on the left; a control panel on the right with a dark window, a black power knob in a metal ring, black keys in recessed frames and the Devcon logo printed on the plastic; on phones and portrait screens the panel is a strip below). Retro is drawn in CSS only (stains, grain and scratches are inline SVG), an approximation of the reference image with no image assets (`html[data-skin='retro']` in `terminal.css`). W/S switch skins on the menu or start screen (`[`/`]` too, anywhere text isn't being typed), with a crossfade (View Transitions where supported) and a toast ("Skin 2/2 · Retro"); `?skin=1|2` picks one and wins over the remembered pick (localStorage `devcon-ix-skin-v4`; picks under the older `devcon-ix-skin`, `-v2` and `-v3`, from when retro, graphite and then pastel was the default, are dropped; applied by an inline script in `index.html` before first paint). The hidden `skin` command lists or switches. The backgrounds work behind both skins. Both skins share the screen size, capped at `--tube-max` (1080 px wide) so large displays don't get a huge TV. On landscape screens with room for it (at least 900×600; `FRAME_MEDIA` in `skins.ts`) the retro TV is a photo (`public/skins/retro/`: `frame.jpg` is the original; `frame-1100`/`frame-1609` `.webp`/`.png` are cut-outs with the glass transparent, its inner edge and reflection kept): the live screen sits under the photo's glass, and the power button, keys and LED are clear HTML hit areas over the photo's own (positions in photo pixels in `terminal.css`). Phones (landscape too), small windows and portrait screens keep the CSS-drawn case and never download the photo; it's preloaded only for the retro skin on desktop, with the CSS case showing until it arrives.

**White (skin 3) and the Studio (scene 7).** They replace the Clear skin (a photo of a translucent monitor on a light studio backdrop, removed with its frames in `public/skins/clear/`). White is the graphite monitor's shape in white plastic: a soft white-to-light-grey gradient with a faint grain and a few grey hairline scratches, a light grey recess round the tube, white keys and power button with dark grey labels, and a white phosphor by default (`html[data-skin='white']` in `terminal.css`, CSS only). The Studio is the sticker wall on the old Clear backdrop, lighter: a near-white wall (#e4e2e1) falling to a lighter floor, a faint grain and a soft vignette (`StickerWall` with kind `studio`, `.bg-wall--studio`); like the night wall its stickers are re-rolled (places, tilts, sizes, wear) every time it's shown. The halo and Lisbon warm-up are off, like the other light scenes. Every skin now shows every background. Together: `?bg=7&skin=3`.

**Shortcut sheet.** `?` opens a modal `<dialog>` (`#keys` in `index.html`) listing the keyboard shortcuts, the background and colour keys included (not the skins: they stay secret); `?`, Esc, Close or a click outside closes it. It opens anywhere nothing is being typed (not mid-email, at `[Y/n]` or with text on the shell line), and the terminal ignores keys while it's open.

**Colours.** The phosphor is green, amber or white: C on the menu or start screen cycles them with a toast ("Colour 2/3 · Amber"), or `color amber` in the shell. The pick is remembered (localStorage `devcon-tty-color`).

**Sharing.** `public/og.png` (1200×630) is a render of `/?skip` on the end screen.

### CTA research: how terminals asked

- **`[Y/n]`** — the capital letter is the default that Enter accepts (Debian `apt`, most Unix installers). Used here: `Join the waitlist? [Y/n]`, so Enter means yes.
- **`Press any key to continue . . .`** — DOS `PAUSE`. Echoed in the power-on prompt.
- **`Strike any key when ready`** / **`Abort, Retry, Fail?`** — DOS boot and disk errors.
- **`Press RETURN to continue`**, **`login:`** / **`Password:`** — Unix and VMS. Used in the boot.
- BBSes: single-key menus (`[C]ontinue, [N]onstop, [S]top`). That's why `y` and `n` act immediately, without needing Enter.


## Licences

- **Lucide icons** (`power`, `skip-forward`, `rotate-ccw`, inline in `index.html`): ISC License, Copyright (c) Lucide Icons and Contributors; icons derived from Feather are MIT, Copyright (c) 2013–2023 Cole Bemis. https://lucide.dev/license
