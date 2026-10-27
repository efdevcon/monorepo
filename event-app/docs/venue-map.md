# Venue map (JWCC plans)

The Map tab's rebuilt map: the real floor plans of the Jio World Convention Centre, extruded
from Figma's top-down SVG exports and rendered in 3D with React Three Fiber. Built from scratch
on 2026-10-25 along `docs/venue-map-rewrite-plan.md`; the prototype it replaces
(`src/app/(page-layout)/map/venue-map-3d/`, `docs/venue-map-3d.md`) stays as a separate variant
until the team is happy with this one.

Code: `src/app/(page-layout)/map/venue-map/` (entry `VenueMap.tsx`), build:
`scripts/map-build/`. `src/components/MapPane.tsx` mounts it when both release gates are on
(`venueMap` and `venueMapNext`, EF internal tools on My Devcon); `venueMap` alone shows the
prototype.

## 1. Inputs: the Figma export contract

One Figma frame per floor, exported as SVG with **"Include id attribute" ON** (the first export
of Level 3 came without ids: 746 anonymous paths, nothing to join; re-export rather than guess)
and dropped at `public/maps/jwcc/source/<LEVEL>.svg` (`L0`–`L3` since 2026-10-26; Scott's exports
live in `~/Documents/EF/Devcon 8/Product/PWA/Map/JWC/Edited - Tests/`). Each floor's frame holds
three geometry groups, matched by name after normalisation (lower-case, runs of non-alphanumerics
→ one dash); anything else under the frame is text and icons and is skipped:

| Figma layer     | Export id           | What the build makes of it                                                                                                                                                                                                                                                                                                     |
| --------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Background`    | `Background`        | Exactly one shape: the **slab**, extruded 4 m downwards. Its fill is the slab colour. Levels 1–2 (re-exported 2026-10-26 with their balcony voids, from `…/JWC/To add/Updates/`) leave it as a boolean (`Subtract`) loose on the frame: accepted with a warning, group it under `Background` in Figma. A hole drawn to the slab edge is a **balcony void**: it becomes a notch in the slab (`notchHoles`, `VOID_EDGE_EPS_PX`) and the exterior wall is cut over it (below), so the void opens onto the floor below (Scott, 2026-10-26).                                                                                                                                                                                                                                          |
| `Colour_Box`    | `Colour_Box`        | One filled shape per **tappable area**, named `<area-id>[-<n>]` (`lotus-stage-2`, `tea-&-coffee-7`, `washroom-9`). `<area-id>` must be a key of `data/areas.ts`; `-<n>` is the instance number. The fill is the footprint's colour.                                                                                            |
| `Outline`       | `Outline`           | Paths named `wall`, `wall_2`, … (at any depth) are **walls**: stroked lines, expanded to the stroke width (mitred) and extruded 3 m in the slab colour, drawn by their edge lines (the plan's stroke colour is ignored; Scott, 2026-10-25). On a floor that names **no interior** wall (Level 2, which names only its two rings; Levels 0–1 name their walls and escalators since their 2026-10-26 re-exports), every stroke-only line at least `WALL_MIN_STROKE_PX` (4 px) wide is a wall instead, the plan drawing walls at ~4.8 px and detail lines at ~2 px; a floor that names its interior walls has exactly those (Level 3's Lotus hall-name tabs are drawn at wall width). The **exterior wall** is the named wall whose box is the slab's (`EXTERIOR_WALL_TOL_PX`): it is also cut over the balcony voids, by half its width. Everything else in the group is flat **decoration** (exit signs, stairs, arrows) at 0.15 m, including a **hatch**: an unnamed subgroup of three or more stroke-only lines and nothing else (stair treads, the ticks of an operable wall). A shape filled in the slab colour is a **door opening**: it is not drawn, and the walls passing through its box are cut. Stroke-only closed boxes under 2.5 m (the column markers), stroke-only closed boxes centred outside the slab (the hall-name tabs on the top edge) and stroke-only closed boxes with an edge lying on a colour box's edge (`LABEL_TAB_TOL_PX`; the "LOTUS 1 / 2 / 3" tabs on the Lotus halls, empty since their names went; Scott, 2026-10-27) are dropped, and so is the plan's **2D outline ring**: one closed stroke whose box reaches `OUTLINE_RING_MIN_PX` (5 px) beyond the slab on every side (Levels 0–2 draw one ~20 px out; it read as a second wall standing off the floor in 3D, Scott, 2026-10-26), named `wall` or not. Level 3's thick ring sits on the slab edge and is its exterior wall. A **named** subgroup (`escalator`, `escalator_2`, `stairs`) is a place drawn as a diagram: its paths are hidden and it becomes a sprite-only area over the group's bounding box, joined to the catalogue like a colour box; while the catalogue entry has no icon the symbol stays drawn as decoration and is not tappable (none today). An **unnamed** subgroup shaped like the plan's escalator symbol (one closed and two open stroke-only lines plus a child group of two filled arrows) is an escalator too, numbered `escalator-<n>` after the named ones. An unnamed subgroup that is the plan's **stairs** symbol (exactly two filled shapes in the line colour the walls are stroked in, the steps and the arrow, `STAIRS_SYMBOL_M` 1.5–3.5 m on each side) is a stairs place the same way, `stairs-<n>` after the named ones: every floor's four stairwells show the stairs icon since 2026-10-26. |
| `Text & Icon`   | `Text__x26__Icon`   | **Skipped** (the labels and icons are being redrawn; Scott, 2026-10-25). Levels 0–2 export their labels as loose groups beside the layers instead; those are skipped the same way, with one warning per floor naming them. The build reports how many paths it ignored.                                                      |
| `meta` (opt.)   | `meta`              | A straight line named `scale-<metres>` gives metres per plan px. Without it the reference floor (`REFERENCE_LEVEL`, L3) uses `FALLBACK_METRES_PER_PX` (0.05 → Level 3 is ~245 × 114 m) and every other floor is **registered** on it, see below.                                                                                |

**Registration.** The four frames are exported at different sizes (Level 0 is 1.32× and Levels 1–2
are 1.5× Level 3's scale), so the build lines the floors up on marks every floor draws: the
`elevator` colour boxes (`REGISTRATION_AREA`). A floor is scaled so its left- and right-most
elevator centres are as far apart as the reference floor's and shifted so their midpoint lands
on the same world point (`register.ts`, tested); a `meta/scale` line overrides the scale, the shift
still comes from the marks. Levels 1–2 are the building's south band, so they land ~70 m down the
Level 3 footprint. A floor without two elevators keeps the fallback scale at the origin, with a
warning. Each level's `units` in the bundle records the result.

Normalisation examples: `tea-&-coffee-7` → `tea-coffee-7` (area `tea-coffee`, instance 7),
`wall_3` → `wall-3`, `Text__x26__Icon` → `text-x26-icon`. Figma's default names (`Vector_12`,
`Group_4`) are fine for decoration and an error for colour boxes. Forbidden anywhere: masks,
clip paths, images, text, `<use>`, gradients/patterns, filters, blend modes, `style`
attributes; opacity < 1 warns. Supported geometry: `path` (every command, arcs included),
`rect` (uniform or elliptical rx/ry), `circle`, `ellipse`, `polygon`, `polyline`, `line`,
nested `<g transform>` (composed). Figma booleans export as one even-odd path, which the build
turns into an outer ring with holes.

## 2. Build: `scripts/map-build/`

```
pnpm map:build            # writes the three generated files below
pnpm map:build --verbose  # + per-floor counts, scale, door cuts
pnpm map:check            # exit 1 when the committed outputs are stale (CI)
pnpm map:test             # node:test suites of the build and the pure runtime modules
```

Pure TypeScript run with `tsx`, no new dependencies: `xml.ts` (Figma's XML subset), `path.ts`
(path data → flattened subpaths, adaptive flatness 0.25 px, arcs via centre parameterisation),
`transform.ts`, `svg.ts` (walk with composed CTM + the forbidden checks), `register.ts`
(floor registration on the elevator marks), `geometry.ts`
(even-odd ring nesting, orientation, RDP simplify 0.2 px, polylabel anchor, stroke → polygon
with mitred joins, door-box cutting), `names.ts` (the grammar above), `build.ts` (classification
and the catalogue join), `report.ts`, `index.ts` (CLI). Heights and the fallback scale live in
`config.ts`. Any ERROR exits 1 and writes nothing: an unnamed colour box, an area id with no
catalogue entry, a catalogue entry no floor uses, a numbered name without an instance, a
duplicate id, an icon with no PNG, a room mapped to an undrawn footprint.

Outputs, committed, under `src/app/(page-layout)/map/venue-map/data/`:

- `plan.generated.json` — `MapBundle` (`planSchema.ts`, zod-validated on write and on import):
  `{ version: 3, bounds, levels: [{ id, label, name, units, bounds, shapes }] }` (`units` = the
  floor's scale, viewBox and registration offset, for reasoning about a floor that sits wrong), every shape
  `{ key: "L3/lotus-stage-2", id, level, kind: slab|wall|area|deco, areaId?, instance?, polygons:
  [{ outer, holes }], anchor, bbox, height, base?, fill, outline }` in metres (plan x → X, plan y
  → Z). `base` lifts an area drawn inside another one onto the container's top (the tea & coffee
  stand in the Co-work Area), so two zones never share a cap plane.
  One shape per line so diffs show which footprint moved; ~330 KB for four floors (inside the JS
  chunk, no runtime fetch). No prose: names, categories and icons come from the catalogue at runtime.
- `rooms.generated.json` — `{ pretalxRoomId: ["L3/lotus-stage-2", …] }` from `ROOMS` in
  `areas.ts`, the only thing `data/roomAreas.ts` (pure, imported by the schedule) reads.
- `icons.generated.ts` — the `IconName` union from `public/maps/devcon-8/icons/*.png`, so a typo
  in the catalogue is a type error.

## 3. The catalogue: `data/areas.ts`, `categories.ts`, `levels.ts`

`AREAS` is the single source of truth per area id: display `name` (`#` = the instance number,
"Hub #" → "Hub 7"; without it numbered copies share the name and collapse in Find, "Washroom ×2"),
`description` (placeholders today), `category`, `heightClass` (`stage` 5.5 m, `room` 3 m for the
washrooms, the walls' height, `kiosk` 2.5 m for supporter booths and the swag station, `zone` 0.3 m flat mat
for the co-work areas, hubs, tea & coffee, storage and elevators; walls are 3 m), optional
`minWidth` (metres; footprints the plan draws as thin strips are stretched along their short axis
about their centre, the two tea & coffee bars), optional `iconSize` (sprite height in metres when the
footprint-derived size is wrong: escalators and elevators 6.5), optional `icons` (per instance: the
east elevator uses `elevator-left`), optional `hubs` (booth number →
Community Hub id from `src/data/communityHubs.ts`: the hub's mark becomes the sprite, its name and
description the card's, its room joins `roomIds` for the live session, and the plan's "Hub 7" stays
as the card's booth line), optional `tenants` (booth number → `{ name, logo }` for the supporter
booths, logos under `public/maps/jwcc/supporters/`: the website's white lockups as a test, drawn on
a chip in the booth's fill in the card and lists; a shared booth names one supporter only, since who is
present changes mid-event and is updated then; Scott, 2026-10-25), optional
`icon` (sprite PNG), `roomIds` and `website` (the place's own site, https; the card shows "Visit website" under the description with
the north-east arrow the Home guides use; the Open Hardware Zone links Maker's Asylum, Scott, 2026-10-27). `ROOMS` maps Devcon 8 Pretalx room ids to footprints
(`main-stage-lotus` → the three Lotus halls). `CATEGORIES` (Stages, Community hubs, Supporters,
Food & drink, Washrooms, Cowork & discussion, Check-in & swag, Fun & rest, Other) is the only
lucide mapping; `legend` on a category puts one swatch chip for it into the floor legend (chip
labels "Community", "Supporters", "Work & Rest" and "Fun & Culture" since 2026-10-25). `legend` on an area moves it to another
category's chip (the yellow discussion corners and the Open Hardware Zone sit under Community, the
colour they share with the hubs; the Decompression Zone is a `cowork` area, under Work & Rest).
That colour legend is the fallback for a floor without a spec list; every floor has one now
(`data/legend.ts`, Scott, 2026-10-26, like the prototype's mixed legend): one chip per spec in spec order, by
`areaId` (every footprint of the type on the floor, "Badge Pickup" covers both desks) or by
`category` (the suites, fourteen ids), with the type's theme icon or a swatch in its fill while
it has none (the CLS Hangout Area); a category spec with `swatch` keeps the colour square (Level 3's
Community and Supporters, matched on the legend category so the yellow corners stay under Community).
Washrooms, tea & coffee, elevators, escalators and stairs are left out as self-explanatory, and
Level 3 stays short: the three stage kinds, Community, Supporters, Swag Station, Game Zone,
Decompression Zone. A floor with a spec list never falls back to the colour legend.
`rank` orders a category's rows (Lotus halls, then Jasmine, then Music). Since 2026-10-26 the catalogue
also carries Levels 0–2: the Community Led Stage (L0, `stages`) and the CLS Hangout Area beside it
(L0, `hubs`, under the Stages chip by its colour; Scott, 2026-10-26), the Lightning
Stage (L2), `workshop` 1–2 (category `hubs`, the Find chip now labelled "Community"; they share the hubs' yellow and so their chip), fourteen suites (category `suites`,
green chip; named after Ethereum upgrades with their room number, `frontier-suite-102` → "Frontier
Suite 102", `tangerine-whistle-suite-105a` is its own id), Registration / Badge Pickup / Help Desk /
Cloak Room (`checkin`, which now has a "Check-in" chip; the Swag Station moved to the Fun chip of its
colour), the Food Garden, Poster Printing Station, Speakers Lounge, Interview Room, Baby Care Room,
and `stairs` (every floor's four stairwells, the stairs icon). Elevators 2/4/6/8 (east side) use `elevator-left`.
`COMPOSITES` adds rows that stand for several footprints: the
Main Stage (rank 0, first under Stages) highlights the three Lotus halls, and the card is titled
after it with the members as the line beneath (`groupName` in the store, `compositeOf`); its Find row shows
the members' icon (the lotus; Scott, 2026-10-26).
`LEVELS` lists the floors bottom-up with their source file (L0–L3); `LEVEL_KEYS` are the
single-key shortcuts (the floor's own number, L0 → 0); `SEARCH_TERMS` (`data/searchTerms.ts`) are the
words Search answers beyond the names and category labels ("meeting" → the suites, "lunch" → food &
drink, "exit" → escalators and stairs, "toilet", "lift", "badge", "merch", "nap" and some thirty
more rows, approved by Scott on 2026-10-26; a term matches as the whole query, as its start from three
letters, or as a whole word inside it; a test checks every target exists); `LEVEL_ALIASES` is how Search parses
"level 3" / "l3" / "ground floor". Adding a floor: one `LEVELS` entry + the export + `pnpm map:build`.

`data/resolve.ts` joins the bundle to the catalogue once at module load into `Area` view models
(`AREA_LIST`, `areaOf(key)`, `areasOnLevel`): everything else reads `Area`, never the bundle.

Icons reused from the prototype's theme set (Scott, 2026-10-25): coffee (Tea & Coffee), toilets
(Washroom), discussion-corner (both corners), cowork (Co-work Area, Quiet Co-work), swag-station,
decompression, press (Content Corner), game-zone (a controller since 2026-10-26, was playground); new on 2026-10-25: elevator-right
and escalator-right (the -left variants are in the folder for other floors), lotus, jasmine,
music-stage, art-gallery, poster-display, open-hardware-zone and storage; new on 2026-10-26 (Scott's
`JWC/icons` folder): badge-pickup, help-desk, cloak-room, poster-printing-station, speakers-lounge,
interview-room, baby-care-room, suites (all fourteen), workshop (both) and stairs (every floor's stairwells are sprite-only places since 2026-10-26, Level 2's by name, the others by
structure; the PNG is mirrored so the runs read right from the start view, Scott, 2026-10-26), plus a restyled swag-station. Hub booths show their
hub's mark (`public/community-hubs/logos/<id>.svg`, India's PNG) via `hubs`, supporter booths
their lockup via `tenants`; the generic community-hub glyph is the fallback for a booth with no
hub. Every catalogue entry now has an icon (Bitget's lockup landed at S4 on 2026-10-25).

## 4. Runtime: `src/app/(page-layout)/map/venue-map/`

```
VenueMap.tsx   shell: reducer, deep link, chrome; mounts Scene client-only
Scene.tsx      Canvas, lights, CameraRig, FloorStack, PointerOwner, Stats
state/         mapStore.ts (reducer + invariants, tested)
camera/        constants, fit (projectedExtent), tween, gestures (tap state machine, tested),
               rig.ts (imperative OrbitControls wrapper), CameraRig.tsx
floors/        placement.ts (rest poses + transition plan, tested), FloorStack, FloorHitPlane, FloorLabel
geometry/      buildFloor.ts (merged statics + per-area extrusions, module cache), materials, FloorMeshes, AreaIcons
interaction/   hoverStore (useSyncExternalStore), pointer.ts (single raycast owner), usePointer
find/          catalogue.ts (Find groups, legend, group primary; tested), FindContent, EntryRow
search/        search.ts (floor-aware query parsing + custom terms from data/searchTerms.ts; tested), SearchContent
ui/            ControlPill, MapPanel, MapSheet, AreaCard, useLiveSessionForArea, FloorSlider,
               TopStrip (ControlsLegend + FloorLegend), useMapShortcuts, Debug
```

- **State** is one `useReducer` (`mapStore.ts`): `{ floor, selected, group, focus: {seq, keys,
  zoom}, resetSeq, panel, query, debug, tuning }`. Invariants (selected on the open floor; group ⇒
  primary selected; query only in Search) are asserted after every transition in the tests. A
  one-floor venue (`SINGLE_FLOOR`) lands with the floor open, never stacks, hides the FloorSlider,
  and Find/Search drop their floor headers and tags.
- **Camera commands derive from state**: `CameraRig.tsx` compares `focus.seq`, `resetSeq` and the
  stack key in one effect (focus > reset > settle) and drives `rig.ts`, which owns OrbitControls,
  the fit (`projectedExtent` of the stack's box, or of the open floor's own bounds: Levels 1–2 are the
  south band and sat low and small in the building's box, so every floor change re-fits; exact at any
  azimuth; desktop `FIT_MARGIN` 0.82 all round, phones fit the width to `PHONE_FIT_GUTTER_PX` 8 px
  gutters, the stack keeping `PHONE_LABEL_ROOM_PX` 42 px on the right for the labels' column (20px
  labels, 12px off the corner) and sitting `PHONE_STACK_LIFT_PX` 72 px above centre in portrait so the
  lowest label clears the floor slider; Scott, 2026-10-26),
  the zoom clamps (0.85×–6× fit, 10× on phones, where supporter lockups and small booths were hard to
  read and tap at 6×), tweens (350 ms double-tap, 800 ms floor/reset/focus, 0 under
  reduced motion), the per-frame target clamp to the floor, and `touched` (a grab interrupts a
  tween and stops resize from re-applying the start pose). A focus pending when the client-only
  canvas mounts (a deep link) still runs: the previous-seq ref starts at 0.
- **One raycast owner** (`pointer.ts`) on the canvas element: hover on every mouse move against the
  `HIT_LAYER` (the open floor's areas and sprites, the per-floor hit planes while stacked; a
  parked floor is invisible but a raycaster still hits it, so only the open floor is on the layer),
  frozen once a press travels past 10 px; taps on release (area → select, floor → open, nothing →
  close the card); double-tap → `rig.zoomAt`. No R3F pointer events anywhere, so there is no
  over/out pairing. Hover lives in `hoverStore`; each mesh subscribes to its own key, the cursor
  and `window.__mapHover` (debug) read it imperatively.
- **Geometry**: per level, slab + walls + decoration merge into one vertex-coloured mesh plus one
  merged edge set (Level 3: 101 statics → 2 draw calls); each area keeps its own extrusion and
  edge lines so its materials can change (`base | hover | selected | dimmed`, cached per colour).
  Front faces + polygonOffset, as in the prototype. Sprites (`geometry/spriteImage.ts`) rasterise
  their PNG or SVG once onto a 256 px canvas (texture + per-pixel alpha for the hit test, cached per
  URL; the hub SVGs carry width/height so they rasterise cleanly) and size from the footprint's
  shorter side (×0.9, clamped 2.4–6.5 m) unless the catalogue sets `iconSize`, and a wide lockup
  is capped at 1.15× the footprint's longer side; an SVG without width/height is fetched and given
  its viewBox size first (Safari draws it 0×0 otherwise). They bob while selected (upwards from the rest pose only, so the logo never dips into its booth; 2026-10-25). Hidden areas (escalators) have no mesh, only the sprite takes the pointer.
- **Chrome** is the prototype's design, re-implemented: 44 px Find/Search pills bottom-left, the
  floor slider bottom-right (multi-floor only), a phone in landscape dropping the bottom tab bar while
  the pane is active (`<html data-app-chrome-off>`, as the schedule does; the pills and the strip clear
  the notch via `--safe-left` / `--safe-right`, and the Find / Search sheets pad their content past it
  (`MapSheet`); Scott, 2026-10-26/27), the top strip (controls legend while stacked or
  when the floor has no legend; on a touch device held upright a "Tip: Try landscape mode" banner with a
  turning phone glyph sits under the controls, gone in landscape and from lg up (Scott, 2026-10-27); otherwise the floor's legend chips, icons per place type on
  Level 3's Community and Supporters as swatches), `AreaCard`
  (stages keep the icon disc, everything else inline; desktop beside the footprint via
  `--poi-x/--poi-y` written by `FloorStack` per frame, group picks bottom-centre), live session
  from the footprint's `roomIds`, shortcuts (digits, F, /, Esc/A), the team-only wrench + tuning
  panel (desktop), `window.__mapCamera` / `__mapHover` / `__mapControls` while the wrench is on.
- Deep link `?area=L3/lotus-stage-2` (several keys comma-separated: the Main Stage link highlights
  all three Lotus halls) re-runs on every visit of the pane, as an effect dispatching `showAreas`.

## 5. Verification

Headless with the gates flipped locally in `releaseGates.ts` (never committed): `node
../scripts/shot.mjs /map --port <port> --widths 390,1440 --wait 8000`, the deep link for the
"floor + card + focus" state, a one-off playwright-core script for hover (canvas `style.cursor`),
taps (`[role=dialog][aria-hidden=false]`), F / `/` panels, legend chips, double-click and Esc
(2026-10-25: all green, no console errors). `pnpm map:test` covers the parsers, geometry, reducer
invariants, taps, floor placement, catalogue and search. `pnpm typecheck` and `pnpm lint` clean.

## 6. Open with Scott (2026-10-25)

- Icons: the reused set is provisional; stages, booths, galleries have none. The tea & coffee stand
  inside the Co-work Area sits mid-right in the plan, so its icon stands next to the laptop; moving
  the footprint towards the bottom edge is a Figma edit + re-export.
- Hub booths 5 and 6 were not on the floor-plan excerpts; Agentic Hub (5) and Legal & Governance
  Hub (6) are placed there provisionally in `areas.ts`.
- Descriptions in `areas.ts` are one-line placeholders; booth names are "Flagship Supporter F1" /
  "Core Supporter C2" / "Starter Supporter S12", hubs "Hub N".
- Scale: no `meta/scale` line yet; 0.05 m/px is a guess (the halls look right, heights are tuned
  to it). Phones fit the width to 8 px gutters since 2026-10-26; the stack's right gutter holds the
  labels' column, so the stack is narrower than a single floor by that much.
- `main-stage-lotus` → all three Lotus halls is an assumption about how the hall is used.
- Levels 0–2 (2026-10-26): the exports name their colour boxes but not their stairs, and leave
  the labels loose beside the layers, so the build's fallbacks (§1) carry them; Level 0's
  re-export later that day names its walls and escalators (and cuts door openings into the
  exterior walls); Levels 1–2's re-exports the same day add the balcony voids and name Level 1's
  walls. In Figma, when next touched: name the stair symbols (`stairs`, `stairs_2`; Level 2 has
  `stairs-`, `stairs-_2`…; the build finds the others by structure meanwhile), put Levels 1–2's
  `Subtract` slab inside their `Background` group, name Level 2's interior walls as Level 1's are, and
  group the loose labels under "Text & Icon". The unnamed blue box beside the Community Led Stage on Level 0 is
  named `cls-hangout-area` in the committed copy only (name it in Figma). Pretalx's
  `cls-builders-room` has no box on the plan yet (Scott adds one on 2026-10-28); until then its
  sessions' "Show on Map" points at the hangout area, roughly where they happen.
- Icons still missing: CLS Hangout Area (the Food Garden reuses the food-area icon, provisional;
  the Lightning Stage, Community Led Stage and a redrawn wristband arrived 2026-10-26).
- Suites / the magenta rooms (Speakers Lounge, Interview Room, Baby Care Room): category names
  and descriptions are guesses from the plan; the magenta rooms sit under Other with no legend
  chip. The workshops are Community (Scott, 2026-10-26).
