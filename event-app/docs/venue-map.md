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
and dropped at `public/maps/jwcc/source/<LEVEL>.svg` (`L3.svg` today). Each floor's frame holds
exactly four top-level groups, matched by name after normalisation (lower-case, runs of
non-alphanumerics → one dash):

| Figma layer     | Export id           | What the build makes of it                                                                                                                                                                                                                                                                                                     |
| --------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Background`    | `Background`        | Exactly one shape: the **slab**, extruded 4 m downwards. Its fill is the slab colour.                                                                                                                                                                                                                                          |
| `Colour_Box`    | `Colour_Box`        | One filled shape per **tappable area**, named `<area-id>[-<n>]` (`lotus-stage-2`, `tea-&-coffee-7`, `washroom-9`). `<area-id>` must be a key of `data/areas.ts`; `-<n>` is the instance number. The fill is the footprint's colour.                                                                                            |
| `Outline`       | `Outline`           | Direct children named `wall`, `wall_2`, … are **walls**: stroked lines, expanded to the stroke width (mitred) and extruded 3 m in the slab colour, drawn by their edge lines (the plan's stroke colour is ignored; Scott, 2026-10-25). Everything else in the group is flat **decoration** (exit signs, stairs, escalators, arrows) at 0.15 m. A shape filled in the slab colour is a **door opening**: it is not drawn, and the walls passing through its box are cut. Stroke-only closed boxes under 2.5 m (the column markers) and stroke-only closed boxes centred outside the slab (the hall-name tabs on the top edge) are dropped. A **named** subgroup (`escalator`, `escalator_2`) is a place drawn as a diagram: its paths are hidden and it becomes a sprite-only area over the group's bounding box, joined to the catalogue like a colour box. |
| `Text & Icon`   | `Text__x26__Icon`   | **Skipped** (the labels and icons are being redrawn; Scott, 2026-10-25). The build reports how many paths it ignored.                                                                                                                                                                                                          |
| `meta` (opt.)   | `meta`              | A straight line named `scale-<metres>` gives metres per plan px. Without it `FALLBACK_METRES_PER_PX` (0.05 → Level 3 is ~245 × 114 m).                                                                                                                                                                                         |

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
`transform.ts`, `svg.ts` (walk with composed CTM + the forbidden checks), `geometry.ts`
(even-odd ring nesting, orientation, RDP simplify 0.2 px, polylabel anchor, stroke → polygon
with mitred joins, door-box cutting), `names.ts` (the grammar above), `build.ts` (classification
and the catalogue join), `report.ts`, `index.ts` (CLI). Heights and the fallback scale live in
`config.ts`. Any ERROR exits 1 and writes nothing: an unnamed colour box, an area id with no
catalogue entry, a catalogue entry no floor uses, a numbered name without an instance, a
duplicate id, an icon with no PNG, a room mapped to an undrawn footprint, floors whose viewBox or
scale differ.

Outputs, committed, under `src/app/(page-layout)/map/venue-map/data/`:

- `plan.generated.json` — `MapBundle` (`planSchema.ts`, zod-validated on write and on import):
  `{ version: 2, units, bounds, levels: [{ id, label, name, bounds, shapes }] }`, every shape
  `{ key: "L3/lotus-stage-2", id, level, kind: slab|wall|area|deco, areaId?, instance?, polygons:
  [{ outer, holes }], anchor, bbox, height, base?, fill, outline }` in metres (plan x → X, plan y
  → Z). `base` lifts an area drawn inside another one onto the container's top (the tea & coffee
  stand in the Co-work Area), so two zones never share a cap plane.
  One shape per line so diffs show which footprint moved; ~120 KB (36 KB gz), inside the JS chunk,
  no runtime fetch. No prose: names, categories and icons come from the catalogue at runtime.
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
a chip in the booth's fill in the card and lists; shared booths show both names, Bitget Wallet at
S4 has no logo yet), optional
`icon` (sprite PNG) and `roomIds`. `ROOMS` maps Devcon 8 Pretalx room ids to footprints
(`main-stage-lotus` → the three Lotus halls). `CATEGORIES` (Stages, Community hubs, Supporters,
Food & drink, Washrooms, Cowork & discussion, Check-in & swag, Fun & rest, Other) is the only
lucide mapping; `legend` on a category puts one swatch chip for it into the floor legend (chip
labels "Community", "Supporters", "Work & Rest" and "Fun & Culture" since 2026-10-25). `rank` orders a category's rows (Lotus
halls, then Jasmine, then Music). `COMPOSITES` adds rows that stand for several footprints: the
Main Stage (rank 0, first under Stages) highlights the three Lotus halls, and the card is titled
after it with the members as the line beneath (`groupName` in the store, `compositeOf`).
`LEVELS` lists the floors bottom-up with their source file; `LEVEL_ALIASES` is how Search parses
"level 3" / "l3". Adding a floor: one `LEVELS` entry + the export + `pnpm map:build`.

`data/resolve.ts` joins the bundle to the catalogue once at module load into `Area` view models
(`AREA_LIST`, `areaOf(key)`, `areasOnLevel`): everything else reads `Area`, never the bundle.

Icons reused from the prototype's theme set (Scott, 2026-10-25): coffee (Tea & Coffee), toilets
(Washroom), discussion-corner (both corners), cowork (Co-work Area, Quiet Co-work), swag-station,
decompression, playground (Game Zone), press (Content Corner); new on 2026-10-25: elevator-right
and escalator-right (the -left variants are in the folder for other floors), lotus, jasmine,
music-stage, art-gallery, poster-display, open-hardware-zone and storage. Hub booths show their
hub's mark (`public/community-hubs/logos/<id>.svg`, India's PNG) via `hubs`, supporter booths
their lockup via `tenants`; the generic community-hub glyph is the fallback for a booth with no
hub. Every catalogue entry now has an icon except a supporter booth with no tenant (Bitget, S4).

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
search/        search.ts (floor-aware query parsing; tested), SearchContent
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
  the fit (`projectedExtent` of the floor/stack box, exact at any azimuth, `FIT_MARGIN` 0.82),
  the zoom clamps (0.85×–6× fit), tweens (350 ms double-tap, 800 ms floor/reset/focus, 0 under
  reduced motion), the per-frame target clamp to the floor, and `touched` (a grab interrupts a
  tween and stops resize from re-applying the start pose). A focus pending when the client-only
  canvas mounts (a deep link) still runs: the previous-seq ref starts at 0.
- **One raycast owner** (`pointer.ts`) on the canvas element: hover on every mouse move against the
  `HIT_LAYER` (areas and sprites while the floor is open, the per-floor hit planes while stacked),
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
  its viewBox size first (Safari draws it 0×0 otherwise). They bob while selected. Hidden areas (escalators) have no mesh, only the sprite takes the pointer.
- **Chrome** is the prototype's design, re-implemented: 44 px Find/Search pills bottom-left, the
  floor slider bottom-right (multi-floor only), the top strip (controls legend while stacked or
  when the floor has no legend; otherwise one swatch chip per legend category), `AreaCard`
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
  to it). Phones: the 2:1 floor fits by width, so the landing view is small; a closer phone landing
  (or a portrait start azimuth) is a one-constant change.
- `main-stage-lotus` → all three Lotus halls is an assumption about how the hall is used.
- Remaining floors: add to `LEVELS` and export; the stack, slider, labels and transitions are
  built and tested but have only run with one floor.
