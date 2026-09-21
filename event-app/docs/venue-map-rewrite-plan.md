# 3D venue map — from-scratch rewrite plan (living document)

**Status:** written 2026-09-17 from a full inventory of the prototype (then on
`3d-map-prototype`, merged to `main` via PR #131); moved into the repo 2026-09-21. Runtime
files live in `src/app/(page-layout)/map/venue-map-3d/`, the build script in
`scripts/plan-map-build.mjs`, the project doc in `docs/venue-map-3d.md`.
**Trigger:** the real per-floor SVG designs are delivered.
**Rule:** whenever a map feature, constant or decision changes on the branch, update §1 (feature
checklist) and the changelog here, not just `docs/venue-map-3d.md`.

**Why:** the prototype grew feature-by-feature against provisional SVGs; the plan is to rebuild
the approach cleanly with the real SVGs, preserving every feature and dropping the isometric
import demo entirely.

**How to use:** when the SVGs land, read this file top to bottom, resolve §8 with Scott, then
execute the phases in §6 in order. Until then, keep §1 in step with the code.

## 0. Decisions (the shape of the rewrite)
- **Keep three 0.186 + R3F 9.7 + drei 10.7.8** (only `Html`, `Stats` from drei; `OrbitControls`
  from `three/examples`). The pain is not R3F; it is effect-ordered camera logic and R3F's
  per-object hover semantics. Keep R3F for rendering and **stop using R3F pointer events**: one
  raycast owner handles hover, tap and double-tap.
- **New folder `src/app/(page-layout)/map/venue-map/`**, replacing the dead old SVG pan-zoom map
  (nothing imports it except `src/data/appImages.ts` → `bg-image-new.png` for CacheWarmer; delete
  both, confirm with Scott). The prototype `venue-map-3d/` stays alive until the `MapPane` swap in
  the last phase, then is deleted.
- **ISO and the flat view are already gone (2026-09-17)**; nothing iso- or flat-related is left to
  carry over. `isoMath.ts` holds only `PX`, `ISO_AZIMUTH`, `START_TURN_DEG`/`START_AZIMUTH`,
  `POLAR_ANGLE`, `projectedExtent`, `scaleHex`, `toHex6`, `polygonArea`.
- **World units = metres**, y up, plan x → X, plan y → Z. No more `PLAN_SCALE 1.75` / `PX 0.01` /
  "ground px" indirection. Scale from an optional `meta/scale-<m>` line in the G SVG, else a
  documented fallback constant. Camera/stack constants re-expressed in metres in phase 1 (today's
  venue is ~25 world units wide; `levelGap 6` reads naturally as 6 m).
- **Geometry JSON carries no prose.** One TypeScript catalogue `data/areas.ts` (name, description,
  category, icon, roomId, numbered, heightClass) is the single source of truth. The build script
  joins SVG ids to it and **fails** on unknown ids or unused entries. It replaces `areas.json`,
  `HEIGHTS`, `ICONS`+`icons.ts`, `FILLS`, `DECORATION`, `ID_FIXES`, `pois.ts CATEGORIES`,
  `legend.ts LEGEND` (→ `legend: { kind: "places" | "swatch" }` per category or area in the catalogue),
  `ROOM_AREAS`, `SESSION_ONLY_ROOMS`. Runtime never regexes ids again.
- **One reducer + derived camera commands** instead of six `useState`s with implicit invariants
  and ordering-dependent `CameraRig` effects.

## 1. Feature checklist to preserve (verify each before deleting the prototype)
### Camera / gestures
- Ortho start view turned 25° left of the isometric diagonal (azimuth 20°, polar acos(1/√3));
  fit computed from the ground bounds + stack spread via `projectedExtent` (exact at any azimuth),
  `FIT_MARGIN 0.82`; zoom clamps `0.85×…6×` fit; perspective mode debug-only. 3D is the only view.
- Horizontal rotation only (polar pinned); azimuth clamp `−75° / +85°` from the start (= the old
  −100/+60 around the diagonal; debug-tunable). Mouse: drag rotates, right-drag pans (floor-plane
  panning). Touch: one finger pans, two fingers rotate + pinch-zoom (`TOUCH.PAN` / `TOUCH.DOLLY_ROTATE`).
- Wheel/pinch zoom anchored on the pointer (`zoomToCursor`). Pan target hard-clamped to the floor
  rectangle every frame.
- Double-click / double-tap zooms ×`1.8` keeping the tapped point under the finger; tap = ≤10 px
  travel, ≤400 ms hold, second tap ≤320 ms / ≤40 px; pinch never counts; lost-pointerup recovery.
- Tweens: `350 ms easeOutCubic` (double-tap, pitch), `800 ms easeOutQuint` (floor change, reset,
  focus; 400 felt too fast); `0 ms` under `prefers-reduced-motion`.
- Grab interrupts any tween and a pending reset; resize refits and re-applies start view only if
  untouched; a focus marks the camera "touched"; `frameloop="demand"`, `"never"` when pane inactive.
### Floors
- Landing = G/L1/L2 stacked around y=0 (`levelGap 6`), "All" button active; fit widens by the
  stack's projected spread.
- Tap a floor / its label / a slider stop / `1` `2` `3` opens it; leaving floors move away from
  the entering one; hidden↔hidden floors snap; camera refit rides the same 800 ms clock and keeps
  the user's azimuth. Clean tap on the active slider stop → stack.
- **FloorSlider** (bottom-right, every breakpoint, 44px wide since 2026-09-21): vertical recessed
  track, stops L2/L1/G top→bottom (40 px, 4 px gap), white 36px indicator at `index·44 px` with
  end-aware corner radii (18 px on the side touching a track end, 4 px otherwise, morphing),
  parked one stop below the track and faded while stacked; press-and-hold + drag slides (nearest
  stop to the pointer, idempotent `showLevel`, 6 px tap slop), pointer capture, `touch-action:
  none`, `role=radiogroup` + keyboard via `click.detail === 0` plus Arrow/Home/End keys,
  pointercancel discards the press (never toggles), `cursor-grab` (grabbing while pressed); "All"
  disc (`h-11 w-11`, hairline border, same 16px type as the stops) UNDER the track: white fill +
  indicator shadow + bold purple when stacked, track fill (lavender / lg panel) + medium muted
  otherwise; title "All floors · A / Esc"; stop titles "<name> · <key>".
- Stacked hover: slab tinted 14 % towards dc-purple; **floor labels always visible** as the short
  `label` (G/L1/L2), Poppins bold dc-muted, non-hovered labels dim to 30 % (150 ms); anchored 24 px
  right of the screen-right-most footprint corner (re-chosen per frame), 40 px desktop / 24 px phones.
  **Labels are buttons (2026-09-21)**: click opens the floor, hover hovers the floor (same
  `level:<id>` hover key → slab tint + other labels dim), `hover:text-dc-purple`, `aria-label
  "Open <floor name>"`; only the button takes the pointer, the drei `Html` wrapper stays
  `pointer-events: none`. On phones (`desktop` prop from useIsDesktop, never a canvas-width
  constant) the STACKED home orbit target is shifted 28 screen px along the camera's right vector
  (`PHONE_SHIFT_PX`) so the labels clear the edge; a single floor is centred; reset and stack refit
  share it. Closures created in mount effects read size/stack/desktop through a latest-ref. No
  lift, no shadow (tried, rejected). Invisible hit plane per stacked floor (holes filled) so the
  atrium doesn't leak hovers to the floor below. Hover cleared on every floor change.
### Shapes / icons
- Fills may be named (`white`): every colour helper normalises via `toHex6` first. One `isDimmed()`
  predicate for footprints AND icons (a selection dims the rest; hover un-dims both together).
- Slab extruded downwards (thickness ≈ 24 plan px today), walls, blocks, mats; caps
  `MeshStandardMaterial roughness 0.9`, sides 82 % brightness, hover +8 %, selected +15 %;
  `FrontSide` + `polygonOffset 1/1` (coplanar caps z-fight); 15° edge lines `#333A7F`, `#7235ed`
  when hovered/selected; mats show edges only when hovered/selected; outlines never raycast (Line
  threshold = 1 world unit stole taps). Community hubs fill `#F1BB52`.
- Icon sprites at each footprint's anchor, size by kind (`block 1.15`, `mat 0.95`, `wall 0.6`),
  lift `0.04`, PNG aspect, sRGB, `depthWrite false`, per-pixel alpha hit-test (alpha ≥ 40).
  Selected/highlighted icons bob `±0.12` over `1.8 s` from rest; off under reduced motion.
- Taps rejected when pointer travel > 8 px; background tap closes the card; cursor `pointer` over
  hoverables else `grab`.
### Find / Search (two surfaces since 2026-09-21)
- Bottom-left row of two 44px `ControlPill`s, "Find" (`TextSearch` icon) and "Search" (`Search`
  icon), 16px bold labels, `pl-3 pr-4` (4px more on the label side or the pill reads lopsided), `gap-2`, same row as the slider on every breakpoint; on phones the whole bottom-controls
  row fades + goes `inert` while the AreaCard is open. One panel/sheet open at a time (`panel:
  "find" | "search" | null`); opening one closes the other; `closePanel` clears the query.
- Shells: desktop `MapPanel` (380 px, `left-6`, `bottom: 1.5rem + 56px`, stays mounted, `inert`
  when closed, Esc + outside-click close, ignores clicks on any `[data-map-trigger]`, focuses
  `inputRef` when given, else the `[data-autofocus]` element — Find's first category row — so the
  arrow keys work the moment it opens); phone `MapSheet` = house `BottomSheet` (`fit`), no autofocus (iOS
  keyboard limitation; `SearchContent` keeps a local input ref so the arrow keys work with a
  hardware keyboard). One shell per breakpoint per panel.
- **Find** (`FindContent`): title "Find a place", 10 ordered categories (Stages, Classrooms &
  breakout, Meeting rooms, Food & drink, Toilets, Cowork & discussion, Community hubs, Check-in &
  swag, Fun & rest, Other) with lucide icons; grouped by floor in building order; same-name
  footprints per floor collapse to one row `×N`; numeric-aware sort; accordion (one category
  open); expanded body `dc-panel`, rows hover `dc-purple-wash`. Keyboard: arrows walk every row in
  DOM order, ArrowRight/Left open/close a category, Enter activates; focused rows look hovered.
- **Search** (`SearchContent`): title "Search the map", `SearchInput` (placeholder "Rooms, food,
  floors…", `resultCount` while typing), empty until typed; flat hit list with `G`/`L1`/`L2` tags;
  floor-aware parsing (`level 1`, `l1`, `ground`, `toilets l1`; bare digits are names); bare floor
  → "Level 1 · N places" row → opens floor; empty state quotes the query. Keyboard: ArrowDown from
  the field enters the list, ArrowUp from the first row returns to the field, typing on a row
  re-focuses the field. `/` opens Search (preventDefault).
- Shared `EntryRow` (theme PNG or category glyph, name, `×N`, optional floor tag).
- Pick single → open floor, select, card, focus (zoom `2.2` mobile / `1.35` desktop over fit).
  Pick group → select member nearest group centre, highlight all (hover look + bob), fit group
  diagonal at 55 % of shorter viewport side, clamped between floor fit and single zoom. Re-pick
  re-focuses. Category chips deferred by Scott (categories ready).
### Top strip: controls legend ↔ floor legend
- `TopStrip` (in `ControlsLegend.tsx`): phones `inset-x-4 top-[calc(var(--safe-top)+12px)]`
  (`max-lg:right-14` while offline), lg centred at `top-[80px]`; `hidden` fades it while the card
  or a panel is open; `dismissed` fades it on phones only. Chip row wraps on phones, `lg:flex-nowrap`.
- **Stacked** → `ControlsLegend`: tap target first, items vary by `pointer: coarse`; touch copy
  "Tap a floor · Swipe pans · Two fingers rotate · Pinch zooms · Double tap zoom-in", mouse "Click a
  floor · Drag rotates · Right-drag pans · Scroll zooms · Double click zoom-in"; kbd chips `1 2 3
  Floors · F Find · / Search · Esc All floors` (A works but is unlisted) via `hidden lg:contents`. Phones:
  fades after the first gesture (controls `start`, double-tap, or opening a floor; CameraRig
  `onInteract`) and returns whenever the stack returns; desktop permanent while stacked.
- **Floor open** → `FloorLegend` (2026-09-21, every breakpoint): one chip per entry of
  `buildFloorLegends(plan).get(level)`; `LEGEND` in `legend.ts` is a per-floor spec list with two
  chip kinds: `places` (one chip per matching footprint, 20px theme PNG + name cut at " - ", so
  "Stage 1") and `swatch` (one chip for all matching footprints: 14px rounded square in the fill
  + label). Today G → Decompression Zone, Hacker Cave, Playground, Registration, Swag Station;
  L1 → seven stages + Classrooms swatch; L2 → Blue Discussion Corner + Breakout rooms / Meeting
  rooms / Speakers Space swatches. 12px dc-muted, `hover:text-dc-purple`, tappable → same path as
  a Find pick (a swatch chip highlights the whole group); `aria-label "<Floor name> legend"`.
  Floors with no entries show nothing. Rewrite: `legend` on the area catalogue (per category or
  area, with the chip kind).
### Card / deep link / live session
- `?area=<level>/<id>` opens floor, selects, focuses; re-focuses on a repeat visit (visit counter
  today → `focus.seq`); keyed on pane active. "Show on Map" in session details always renders;
  unknown room → plain `/map`.
- `AreaCard`: fixed bottom (`--nav-clearance`+16 px), full width phone / 440 px desktop,
  `bg-white/95 backdrop-blur`, 150 ms slide+fade, keeps last area for exit; **stages**: 64 px icon
  disc (48 px icon) riding the top edge at −70 %, same fill, no shadow, body `pt-6`; **everything
  else**: the 48 px icon inline left of the text block (`categoryIdFor` decides); **group pick**
  (`group` prop = a highlighted set): desktop card bottom-centre (`lg:bottom-6 lg:left-1/2
  -translate-x-1/2`) instead of anchored beside the footprint; the placement is held (like
  `shown`) while the card fades out, because closing clears selection and group together; `CloseButton` centred on
  the top-right corner (half outside, white + shadow, exact — took three rounds); title 16 px bold;
  **floor line (2026-09-21)**: the spoken floor name ("Level 1") as plain 12px dc-muted text,
  `mt-1.5`, no icon (tried, noise), shown even in the session-only state; blurb 14 px muted; `role=dialog`. Desktop
  anchoring clamps the wrapper top to `HEADER_OFFSET_DESKTOP (65) + 45 (disc overhang) + 12`; card
  size comes from a ResizeObserver, not per-frame layout reads.
- Live session for mapped rooms (`useSessions({roomId}) + useNowMs(60_000) + getStatus==="live"`):
  outlined dc-red "Live now" 11 px tag opposite the title, session title as `DetailLink` (kind
  session, chevron, lavender hover), meta row Clock3 time · Presentation type · User speakers (no
  length). Main Stage hides blurb + divider while live. Test `?mockNow=2024-11-12T03:15:00.000Z`
  on DC7 data. DC8 room id is `keynote-stage`.
### Chrome / a11y / shortcuts / debug
- Shortcuts `1/2/3` open G/L1/L2 (never toggle), `F` opens Find, `/` opens Search (preventDefault), `A` or `Esc`
  close the card first then reset; gated on pane active, no panel open, no detail view, no
  modifier, not typing.
- OfflineIndicator sits fixed top-right on /map phones.
- Map-tab re-tap (`useTabReselect`) = full reset. Every transition honours reduced motion.
- Debug wrench (local state, NOT `?debug`) top-left at `left-6 top-[80px]`, **desktop only** (`hidden
  lg:flex`, as is the app-wide debug FAB on /map), toggles the tuning panel (gap 2–12, show icons,
  rotate 0–180°, zoom step 1.2–3, projection), drei `Stats`, `window.__mapCamera` `{zoom, position,
  target, azimuth, polar, size, canvas}`, `window.__mapHover` (`"G/toilets-1"` | `"level:G"` | null)
  and `window.__mapControls`. App-wide debug FAB docks under the wrench on `/map`. The open tuning
  panel overlaps the desktop Find/Search panels (dev-only, accepted).
- Client-only canvas via `next/dynamic ssr:false` with "Loading map…" fallback.

## 2. Integration seams that must stay byte-compatible
- Named, props-less export `VenueMap3D` mounted by `src/components/MapPane.tsx` inside
  `fixed inset-0 z-0 flex` (root `relative min-h-0 min-w-0 flex-1` — WITHOUT `min-w-0` the canvas's
  intrinsic width stops the flex item shrinking when the window narrows), inside `Suspense`; the
  pane is **never unmounted** (persistent `TabPanes`), so store + WebGL survive tab switches.
- `usePaneActive()`, `useTabReselect(reset)` from `@/components/paneContext`.
- `useSearchParams().get("area")`; carried params `dataset/mockNow/mockSpeed/debug` come free via
  `@/routing`.
- Pure (three-free) `roomAreas.ts` exporting `AREA_PARAM`, `mapHrefForRoom`, `roomIdForArea`,
  `parseAreaParam`; imported by `src/components/schedule/SessionDetailsContent.tsx`. Update that
  import path in the swap phase.
- CSS vars `--nav-clearance`, `--safe-top`; tokens `dc-fg/fg2/muted/hairline/purple/purple-wash/
  purple-soft/red/lavender/panel/border` (Tailwind v4 `@theme` in globals.css).
- `DebugCorner` classes `fixed left-6 top-[80px] z-20 hidden flex-col … lg:flex`, 44 px disc, `gap-3`:
  `src/components/DebugPanel.tsx` hardcodes 136 / 192 px against them (lg only). Move verbatim.
- `AppHeader` `routeChrome` returns `bare: true` for `/map`: the mobile bar is `hidden` (NOT
  unmounted: the `#header-actions` portal node must survive, persistent panes cache it once), the
  map runs full-bleed under `--safe-top`. Keep the route in that branch.
- Shared: `BottomSheet`, `SearchInput` (structural `inputRef`, `resultCount`), `CloseButton`,
  `DetailLink`, `useIsDesktop/useMediaQuery/isDesktopNow` (breakpoint layout in CSS `lg:`, the hook
  only picks the Find/Search shell), `useOnline`, `useNowMs`, `useSessions`, `getStatus`,
  `formatTimeRange`, `useDetailView`.
- Serwist: `/map` precached; JSON + three chunk ride the `_next/static` SWR rule; icon PNGs only
  opportunistically cached (add to `additionalPrecacheEntries` if first-paint offline matters).

## 3. SVG authoring contract (agree with Scott BEFORE the real exports)
Files: one Figma frame per floor named `G` / `L1` / `L2`, exported to
`public/maps/devcon-8/source/<LEVEL>.svg`; root `<g id>` must equal the filename; identical
`viewBox` on all floors (error otherwise); slabs compared by bbox (warn > 2 px).
Export: SVG with **Include "id" attribute** ON, **Simplify stroke** ON, never "Outline stroke"
(turns a stroked rect into a ring path = fake hole). Booleans export as one
`<path fill-rule="evenodd">` named after the group, which is exactly what we want.
Layer-name grammar (Figma keeps names verbatim as `id`; duplicates get `_2`):
```
slab                         exactly one per floor; Subtract boolean whose holes are the atrium/voids
wall | door                  anonymous; Figma _N suffixes tolerated, re-indexed wall-1…n
room/<area-id>[-<n>]         enclosed tap target, extruded to catalogue heightClass (stage/room/kiosk)
zone/<area-id>[-<n>]         flat tap target (mat)
deco/<name>                  drawn, never tappable, not catalogued (atrium-floor, exit-arrow-1)
meta/scale-<metres>          optional straight line of known length → metres per plan px
ignore/<anything>            subtree skipped
modifiers: @h=<m> height override, @no-outline, @no-icon
```
`<area-id>` = `[a-z0-9]+(-[a-z0-9]+)*`, must exist in `areas.ts`; `-<n>` only when the entry is
`numbered`; duplicate `<area-id>-<n>` on a floor = error; Figma default names (`Rectangle 12`,
`Vector 5`, `Union`, `Subtract`) = error. Forbidden: masks, clip paths (nested frames with "Clip
content"), gradients/images/patterns, `<text>`, `<use>`, effects/filters, blend modes; warn on
opacity < 1. Allowed: `rect` (uniform rx), `path`, `circle`, `ellipse`, `polygon`, `polyline`, `g`
(with transforms, composed).
Migration of today's names: `Union`/`Subtract` → `slab` (G needs its atrium hole too, replacing
`Vector 5` + `deco/atrium-floor`); `Vector 1–4` → `deco/exit-arrow-N`; `Stage-1-Fans`,
`Stge-3-Fabrics`, `stage-5-hat` → `room/stage-N` (theme name lives in the catalogue);
`main-stage-mask` → `room/main-stage` (`roomId: keynote-stage`); `music stage` → `room/music-stage`;
`[layground` → `zone/playground`; `breakout-room-1_2` → `room/breakout-room-2`;
`meeting-room-9_2` → `room/meeting-room-12`; `coffee-station-*` (L1) vs `food-area-*` (G/L2) →
pick one; L2's stray `cowork-space-1`/`food-area-2`/`blue-discussion-corner` copies → delete or a
`levels:` constraint catches them; `press-room`, `community-hub-4`, `classroom-f` need catalogue
entries + descriptions; unused `areas.json` entries (`yoga-room`, `escalator-*`, `wayfinding-*`,
`power-up-snacks-*`, …) → draw or delete. Stage-front wall strips: don't draw them (the heuristic
removal is deleted).

## 4. Build pipeline v2 (`scripts/map-build/`)
Stack: `svg-parser` (zero-dep XML → tree; already in the lockfile via @svgr) + `svgpath`
(abs/unshort/unarc/transform with composed CTM) + `polylabel` (pole of inaccessibility for icon
anchors) as devDeps; `zod` (present) for schemas; run with `tsx` (present, matches other
`scripts/*.ts`); tests with `node --import tsx --test`. Node 24.
Layout: `index.ts` (CLI `--check --level --verbose`), `config.ts` (LEVELS, HEIGHT_CLASSES in metres:
wall 3.2, door 2.2, stage 5.0, room 4.0, kiosk 2.4, zone 0.08, deco 0.04, slab 0.6 down;
FLATNESS_PX 0.25, SIMPLIFY_PX 0.2, fallback scale), `svg.ts` (walk with CTM + forbidden checks,
element→path d), `geometry.ts` (flatten adaptively, rings → outer/holes by containment depth
honouring evenodd, orient outer CCW / holes CW, RDP simplify, polylabel anchor, bbox, area),
`names.ts` (grammar parser), `catalogue.ts` (join, unknown/unused → ERROR), `report.ts`
(diagnostics grouped ERROR/WARN with `<file>#<id>`, `console.table` per floor), `fixtures/*.svg`
+ `*.test.ts` (transform nesting, relative commands, evenodd slab, rect rx, circle/ellipse/polygon,
L-shape anchor, name grammar incl. error cases, snapshot of the real SVGs = `--check`).
Output `data/plan.generated.json` (v2, pretty, deterministic, ~same chunk size):
```ts
MapBundle { version: 2; units: { metresPerPlanPx; viewBox }; bounds; levels: MapLevel[] }
MapLevel  { id: LevelId; label; name; bounds; shapes: MapShape[] }
MapShape  { key: `${level}/${id}`; id; level; kind: slab|wall|door|room|zone|deco;
            areaId?; instance?; polygons: { outer: [x,z][]; holes: [x,z][][] }[];
            anchor: [x,z]; bbox: [minX,minZ,maxX,maxZ]; height; fill; stroke: string|null;
            outline: boolean }
```
Plus `data/rooms.generated.json` `{ [roomId]: key }` so `roomAreas.ts` stays a tiny pure module,
and `data/icons.generated.ts` (`IconName` union from `public/maps/devcon-8/icons/`) so a typo in
`areas.ts` is a type error. Dropped fields: `source`, `planScale`, `fit` (camera computes it),
`generatedFrom`, `name/description/icon/category/tappable` (from the catalogue join at runtime).
Validation: `MapBundle` zod parse before write; exactly one slab per level; ≥3 points per ring;
every `areaId` known; every catalogue `icon` PNG exists; unique `roomId`; no duplicate keys.
Scripts: `map:build`, `map:check` (CI: committed JSON stale → exit 1), `map:test`.

## 5. Runtime architecture (`src/app/(page-layout)/map/venue-map/`)
```
VenueMap3D.tsx  Scene.tsx
data/      plan.generated.json rooms.generated.json icons.generated.ts planSchema.ts areas.ts
           categories.ts (id, label, Icon, legend: boolean) levels.ts (LEVEL_ORDER, aliases, keys)
           roomAreas.ts resolve.ts
state/     mapStore.ts (pure reducer + invariants + selectors) useMapStore.ts (deep link, reselect)
camera/    fit.ts tween.ts intent.ts rig.ts gestures.ts CameraRig.tsx
floors/    placement.ts FloorStack.tsx FloorHitPlane.tsx FloorLabel.tsx (button)
geometry/  buildFloor.ts materials.ts FloorMeshes.tsx AreaIcons.tsx
interaction/ pointer.ts hoverStore.ts usePointer.ts
find/      catalogue.ts FindContent.tsx EntryRow.tsx
search/    search.ts (searchFind, parseFloorQuery) SearchContent.tsx
ui/        ControlPill.tsx MapPanel.tsx MapSheet.tsx AreaCard.tsx useLiveSessionForArea.ts
           FloorSlider.tsx TopStrip.tsx ControlsLegend.tsx FloorLegend.tsx useMapShortcuts.ts
           DebugToggle.tsx DebugPanel.tsx
```
- **State** (`mapStore.ts`): `{ floor|null, selected: AreaKey|null, group: {keys, bounds}|null,
  focus: {seq, target, bounds?, zoom}|null, resetSeq, panel: "find"|"search"|null, query, debug,
  tuning }`. Actions: `openFloor` (idempotent), `toggleFloor`, `showStack`, `select`,
  `showAreas(keys, zoom)` (primary = nearest to group centre, sets group + focus.seq+1 in one
  transition), `reset` (resetSeq+1), `openPanel(id)/closePanel/setQuery`, `toggleDebug`, `tune`.
  Invariants asserted in `node:test`: `selected.level===floor`; `group ⇒ selected ∈ group.keys`; a
  floor change clears selection/group/focus unless the same action set them;
  `panel!=="search" ⇒ query===""`. Deep link = effect on `(areaParam, paneActive)` dispatching
  `showAreas`; no render-phase setState, no visit counter.
- **Camera**: `intent.ts` derives at most one `CameraCommand` (`focus` > `reset` > `settle{polar,
  azimuth: base|keep, stackFit}`) from prev/next snapshots; `CameraRig.tsx` has ONE effect that
  runs it on `rig.ts` (imperative class: controls, clamps, tween, `touched`). Gotchas become
  structural: during a tween the rig writes camera/target directly and does not call
  `controls.update()` (no clamp snap, no loosen/restore); `start` event → `interrupt()` drops the
  tween, applies destination clamps, marks touched (no pending-reset flag); `resize()` refits and
  re-applies the start pose only if `!touched`; `focus` marks touched; target clamped each tick.
  `fit.ts` projects the 8 corners of the floor/stack box onto camera right/up for any azimuth.
  `gestures.ts` = pure double-tap state machine (testable). `__mapCamera` keeps today's keys.
- **Floors**: `placement.ts` pure (`restY`, `exitY`, `planFloorTransition` with today's rules),
  tested on G→L1, stack→L2, L1→stack. `FloorStack.tsx` refs + `useFrame`; clears hover on floor
  change. `FloorLabel` is a DOM button (drei `Html`) dispatching `openFloor` and writing the
  floor hover into `hoverStore`.
- **Interaction**: `pointer.ts` is the single raycast owner on `gl.domElement` (`raycaster.layers`
  = HIT layer; nearest hit → first ancestor with `userData.hit` → `hoverStore`
  `{kind: floor|area, key}`). No over/out pairing, no `e.intersections` walk, no
  `stopPropagation`, no `noRaycast`. Hover freezes while a pointer is down beyond slop. Cursor +
  `__mapHover` are store subscriptions (no React render); meshes subscribe via `useHovered(key)`.
- **Geometry**: `buildFloorGeometry(level)` once per level (module cache): outer/holes from the
  bundle (no area sort); statics (walls/doors/deco) **merged** into one `BufferGeometry` with
  vertex colours + one merged `EdgesGeometry` (G: ~90 → 2 draw calls); rooms/zones stay individual
  meshes with materials from a cache keyed `${fill}|${base|hover|selected|tint}`; `FrontSide` +
  `polygonOffset`; sprites as today, on the HIT layer only when tappable and the floor is open.
  Lights as today (ambient 1.6, directional [6,12,8] 1.4).
- **Data join**: `resolve.ts` joins bundle shapes to `areas.ts` once (`useMemo`) → `Area` view
  models (label with instance number, icon url, category, roomId, floor name). Find, Search, the
  floor legend (`categories.filter(c => c.legend)`), AreaCard, icons, live session all read
  `Area`; `categories.ts` is the only lucide mapping.

## 6. Phases and verification
Baseline: `pnpm dev` once (generates `next-env.d.ts`), then `pnpm typecheck` + `pnpm lint`.
Screenshots: `node ../scripts/shot.mjs /map --port <port> --widths 390,1440 --out <dir>` (one
`--out` per state, the file name is derived from the path); one-off playwright-core scripts in
`monorepo/scripts/`, deleted after; slow the tween clock 20× via an `addInitScript` override of
`performance.now` to capture mid-transition frames. Deep links give static "floor open + card"
states (`/map?area=L1/main-stage-mask`); legend-only, panel and hover states need a script.
0. SVG contract agreed + `areas.ts`/`categories.ts`/`levels.ts`/`planSchema.ts` + new build script
   with tests, run against the CURRENT SVGs through a temporary id→areaId shim so v2 JSON exists
   before the real SVGs land. Verify: build exits 0, per-floor table matches today's counts
   (G 62 / L1 41 / L2 38 shapes, 63 tappable), tests pass. Delete old `venue-map/`.
1. Shell + `Scene` + `buildFloor` + `FloorMeshes` + `materials`; one floor, fixed camera.
   Verify: shots at 390/1440, no z-fighting, Stats draw calls ≈ 40 (was ~270/floor).
2. `camera/*` + `mapStore` with tests; orbit clamps, wheel/pinch, double-tap, reset. Verify:
   `__mapCamera` after wheel then Esc equals the start pose; slowed clock shows no first-frame
   zoom jump.
3. `floors/*` + hover store + pointer owner: stack landing, directional 800 ms transitions, hit
   planes, floor tint + clickable label. Verify: 16 px grid scan of `__mapHover` (nulls only
   off-floor), frame captures of G→L1→stack→L2, cursor not stuck after opening a floor, label
   hover = `level:<id>`, label click opens the floor.
4. Selection + `AreaCard` (+ floor line, live session, sessionOnly) + `FloorSlider` (44px) +
   `ControlPill`s. Verify: tap opens the card with its floor; `?mockNow=2024-11-12T03:15:00.000Z`
   shows the DC7 keynote; Esc closes the card first; measured pill/track sizes 44.
5. Find + Search via `showAreas`; top strip with `ControlsLegend` ↔ `FloorLegend`. Verify:
   "toilets l1" highlights three; floor row opens the floor; both shells; one panel at a time;
   `/` opens Search; L1 shows the seven stage chips, L2 shows no legend; chip tap opens the card.
6. Deep link effect + `roomAreas.ts` + `rooms.generated.json`. Verify: `/map?area=L1/main-stage`
   twice in one session focuses twice; `mapHrefForRoom` output unchanged.
7. Shortcuts, `DebugToggle`/`DebugCorner` verbatim, tuning panel, `__mapCamera`/`__mapHover`.
   Verify: 1/2/3, `/`, Esc headless; the app debug FAB docks at 136/192 px under the wrench.
8. Swap `MapPane` + `SessionDetailsContent` imports, delete `venue-map-3d/` and the
   `bg-image-new.png` warm entry; rewrite `docs/venue-map-3d.md` → `docs/venue-map.md`; update
   this plan. Verify: typecheck, lint, `pnpm build` green; full screenshot pass at both widths;
   real-browser pass (§7).
Phases 1–7 run on the v2 JSON built from today's provisional SVGs; when the real SVGs arrive only
the phase-0 shim is removed and `pnpm map:build` re-run.

## 7. Risks / check in Arc, not only headless
- Materials/lighting/hover looked right headless and wrong in Arc once (floor-shadow experiment):
  check merged vertex-colour statics, polygonOffset edge quality, sRGB sprites at DPR 2.
- Custom raycast owner: one raycast per pointermove against ~130 objects/floor is cheap; confirm no
  hover jitter while dragging.
- Figma may emit `<g transform>`, `<use>`, clip-paths; the parser must fail loudly; contract agreed first.
- `mergeGeometries` needs identical attribute sets (ExtrudeGeometry: position/normal/uv — fine).
- Unit change to metres: re-tune `levelGap`, camera near/far, `ORTHO_RADIUS`, icon sizes, bob
  amplitude, `exitY` in phases 1/3.
- Tab switch mid-tween freezes it (`frameloop="never"`); same today, acceptable.
- Keep Tailwind arbitrary classes that already exist in the tree (a fresh one once failed to appear
  after HMR); restart the dev server if a new class doesn't apply.
- Phone floor legend: seven stage chips wrap to four rows at 390px and cover the top quarter of
  the map; if that stays noisy, consider a single scrolling row or a collapsed "Legend" chip.
- Phone Search sheet cannot autofocus (iOS needs a synchronous focus inside the tap; the sheet
  mounts on open). Keep the search content mounted (as `HeaderSearchDrawer` does) if it matters.

## 8. Open questions for Scott
- Confirm the `room/…` `zone/…` slash grammar is comfortable in Figma (alternative: `room-` prefix).
- Delete `bg-image-new.png` + its CacheWarmer entry with the old map?
- Merge `coffee-station-*` into `food-area-*` or keep both catalogue entries?
- Which DC8 Pretalx room ids map to which stages (for `roomId` in `areas.ts`)?
- Quick-action category chips: still deferred, or part of the rewrite?
- Which categories beyond stages belong in the floor legend (community hubs? discussion corners?).

## Changelog
- 2026-09-17 — first version from the full prototype inventory.
- 2026-09-17 (later) — ISO + flat view removed, FloorSlider, always-on dimming floor labels, legend
  on top, shortcuts 1/2/3/A, start view 25° left with runtime `projectedExtent` fit, touch = pan /
  two-finger rotate.
- 2026-09-18 — review fix round: desktop prop, stacked-only phone shift, latest-ref closures, slider
  cancel/arrow keys, 44px hit boxes, Find local ref, `toHex6`/`isDimmed`, card clamp +
  ResizeObserver, phone legend dismissal, offline marker, hidden-not-unmounted header bar.
- 2026-09-21 — feedback round (moved this plan into the repo): controls 44px (Find/Search pills,
  All, slider track; text stays 14px); Search split out of Find into its own pill + `MapPanel`/
  `MapSheet` shells (`ControlPill`, `EntryRow`, `SearchContent`; `/` opens Search; one panel at a
  time); floor legend (`legend.ts` `LEGEND_CATEGORIES`, `FloorLegend`, shared `TopStrip`) swaps
  with the controls legend when a floor opens, on every breakpoint; floor labels clickable +
  hoverable; area card floor line. §0, §1, §2, §5, §6, §7, §8 updated.
- 2026-09-21 (later) — same-day follow-up: floor line loses its icon; per-floor `LEGEND` specs with
  `places` and `swatch` chips (G five places, L1 stages + Classrooms swatch, L2 discussion corner +
  three room swatches), stage chips without the theme suffix; `F` opens Find; pills `pl-3 pr-4`.
- 2026-09-21 (evening) — labels 16px on Find/Search/All/stops; Find focuses its first row on open
  (`data-autofocus`); group picks park the desktop card bottom-centre; non-stage cards show the
  icon inline, stages keep the disc.
