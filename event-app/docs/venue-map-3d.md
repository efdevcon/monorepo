# 3D venue map (prototype)

The Map tab renders a React Three Fiber scene instead of the old SVG pan-zoom map. This is
a **prototype built on provisional plans and old event data**: the floor-plan SVGs are
working exports whose layer names are still being fixed in Figma, the area descriptions
are placeholders, and the live-session card is exercised against Devcon 7 data. This
document records the pipelines that turn those inputs into what the tab shows, so the next
iteration can swap inputs without re-deriving the chain.

Code: `src/app/(page-layout)/map/venue-map-3d/` (entry `VenueMap3D.tsx`, mounted by
`src/components/MapPane.tsx` as one of the persistent tab panes). The old map
(`…/map/venue-map/`) and its Devconnect POI data (`src/data/pois.ts`) are dead code kept
for reference; nothing in the 3D map reads them.

## Pipeline 1: floor plans → `plan.generated.json`

```
Figma floor plans (one per floor)
  → export SVG with "Include id attribute"
  → public/maps/devcon-8/source/{G.svg, top-down-geometry-test.svg (L1), L2.svg}
  → pnpm map:build:plan   (scripts/plan-map-build.mjs)
  → src/app/(page-layout)/map/venue-map-3d/plan.generated.json   (~46 KB, imported statically)
```

The bundle is imported by the pane, so it ships inside the JS chunk: no runtime fetch,
works offline under the service worker. Rebuild after any SVG or table change and commit the
JSON (a `jq -S` diff against `HEAD` shows exactly what moved).

What the script does per floor (`LEVELS` table: id, pill label, spoken name, source file):

1. **Shapes.** Every `<rect>` and `<path>` becomes a footprint polygon; curves are flattened,
   rotated rects get `rotate(a cx cy)` applied. The first shape of each SVG is the **slab**,
   extruded downwards (`SLAB_DEPTH` 24 plan px). Coordinates scale by `PLAN_SCALE` 1.75 into
   the "ground px" unit the isometric demo used, so the camera rig and materials are shared.
2. **Layer id fixes.** `ID_FIXES` patches known Figma naming problems (`[layground`,
   `music stage`, `breakout-room-1_2`, `meeting-room-9_2`, unnamed `Vector 1–5`). They are
   logged on every build and should disappear as the Figma files are fixed.
3. **Heights** come from the `HEIGHTS` name-prefix table (the plans carry none): stages 48,
   rooms 38, toilets 30, mats 2. `kindFor` classes a shape as `slab`, `wall`/`door`, `block`
   (tall) or `mat` (≤3). `DECORATION` (`floor-patch`, `arrow-*`) is drawn but never tappable.
4. **Names and descriptions** resolve through `areaFor(id)` against `areas.json`: exact id,
   then the normalised stage id, then the id minus its trailing number (`numbered` entries
   keep the number: "Meeting Room 7"). `nameFor` keeps the theme drawn into a stage's layer id
   ("Stage-1-Fans" → "Stage 1 - Fans"). Unknown ids are humanised with an empty description.
5. **Icons** via the `ICONS` regex table → `public/maps/devcon-8/icons/<name>.png` (22 PNGs,
   the theme artwork). The runtime mirror is `icons.ts` (`iconFor`, `iconUrl`); keep the two
   tables in step. Missing files are warned about and dropped.
6. **Fills** come from the SVG, with `FILLS` overrides where the plan colour is schematic.
7. **Stage fronts**: wall strips drawn against a stage block on its outward side are removed
   so stages stand clear.
8. **Bounds and fit**: per-floor and union ground bounds, plus `isoFit` (screen extent at the
   isometric pitch) which the camera uses for the start view.

Output shape (`types.ts`): `PlanScene { source, planScale, bounds, fit, levels: PlanLevel[] }`,
`PlanLevel { id, label, name, generatedFrom, viewBox, bounds, fit, shapes: PlanShape[] }`,
`PlanShape { id, level, kind, name, description, tappable, outline, polygons, centroid,
icon, height, fill, stroke }`. Layer ids repeat across floors (walls, `toilets-1`), so every
selection key is `${level}/${id}` (`shapeKey` in `planArea.ts`).

Known input problems (fix in Figma, not in code): L2 `food-area-2`, `cowork-space-1` and
`blue-discussion-corner` duplicate L1 rectangles; L1 says `coffee-station-*` where G/L2 say
`food-area-*`; `Stge-3-Fabrics` is a typo the script tolerates; `press-room`,
`community-hub-4` and `classroom-f` have no description in `areas.json`.

## Pipeline 2: plan → Find catalogue (runtime, `pois.ts`)

`buildFindGroups(plan)` runs once per mount (`useMemo`): every `tappable` shape is assigned
a category by id regex (`CATEGORIES`: Stages, Classrooms & breakout, Meeting rooms, Food &
drink, Toilets, Cowork & discussion, Community hubs, Check-in & swag, Fun & rest, Other),
grouped by floor in building order, and same-name shapes on one floor collapse into one
`FindEntry` whose `shapes[]` holds them all (so "Toilets ×4" highlights four footprints).
Each category carries a lucide icon for rows without a theme PNG.

`searchFind(groups, query)` is a case-insensitive substring match on name or category label.
`parseFloorQuery` first splits a floor alias off the query (`FLOOR_ALIASES`: "ground floor",
"gf", "g", "level 1", "l1", "first floor", …); a bare floor lists the whole floor and offers
a row that opens it, a floor plus text scopes the search. Bare digits are never a floor.

The quick-action category chips were deferred; the categories exist for them.

## Pipeline 3: schedule rooms → footprints → live session

```
Pretalx/Notion schedule  →  event store (Dexie, src/data)  →  useSessions({ roomId })
roomAreas.ts: ROOM_AREAS { "main-stage": { level: "L1", id: "main-stage-mask" } }
```

- **Show on Map** (session details) → `mapHrefForRoom(roomId)` → `/map?area=<level>/<id>`.
  `VenueMap3D` treats the param as derived state keyed on the param and on the pane being
  active (a visit counter makes the same room re-focus on a second visit) and calls
  `showShapes([shape])`.
- **Live session on the card**: `useLiveSessionForArea(areaKey)` → `roomIdForArea` →
  `useSessions({ roomId })` + `useNowMs(60_000)` + `getStatus === "live"`. The clock is the
  app's mockable one, so `?mockNow=2024-11-12T03:15:00.000Z` (DC7 keynote) drives it exactly
  like the schedule. The Main Stage card drops its blurb and divider while a session is live
  (`SESSION_ONLY_ROOMS`).
- Only `main-stage` is mapped. DC8 datasets call it `keynote-stage`; the rest of the rooms
  need entries before the deep link is useful in production.

## Pipeline 4 (demo only): isometric artwork → `scene.generated.json`

`pnpm map:build` (`scripts/iso-map-build.mjs`) imports the Figma isometric illustration
(`TEST-Iso-SVG-Map.svg`, node `5795:35828`, exported with ids) into slab + props + room
blocks resolved from `areas.json` seed points. It is kept behind `?source=iso` / the source
switch only to show that importing the artwork in that style does not work; the plan
redraw is the default. Its `Blocks.tsx` still renders double-sided.

## How the pipelines meet on screen

- **`VenueMap3D`** owns `settings` (`source`, `view` 3d/top, `level` or `null` for the
  stack, tuning values), `selected`, `highlighted` (a found group), `focus` (camera target),
  and Find state. `select(area)` is the one path that also clears the group. `showShapes()`
  is the deep link's body factored out and is what Find uses: opens the floor, selects the
  member nearest the group's centre, highlights the rest, and focuses the camera
  (`CameraFocus.bounds` makes the rig fit a group between the floor fit and the
  single-footprint zoom).
- **`Scene` → `LevelStack` → `PlanShapes` / `PlanIcons`**: `LevelStack` positions the floors
  (stack around y = 0, or the chosen floor at 0 with the others parked off-screen) and tweens
  changes on the 800 ms `LEVEL_SWITCH_MS` clock. In the stack each floor group carries the
  handlers, a `FloorHitPlane` and a `FloorLabel` (`FloorHover.tsx`).
- **`CameraRig`**: orbit with the polar angle pinned, azimuth clamped, zoom to cursor,
  double-tap zoom, and every programmatic move a `tweenTo` sharing the floors' clock.
- **Controls**: `Segmented` (source, view, All/G/L1/L2 pills), `ControlsLegend` + `FindButton`
  in one bottom wrapper (Find above the legend on phones, one row from `lg`), `FindSheet`
  (phones, house `BottomSheet`) / `FindPanel` (desktop, stays mounted), `AreaCard`,
  `useMapShortcuts` (G / 1 / 2 / F / Esc). Debug: the wrench (`DebugToggle`) toggles the
  tuning panel, drei `<Stats>` and `window.__mapCamera` / `window.__mapHover`; the app-wide
  dev trigger docks under it on `/map` (`appDebugEnabled()` in `components/DebugPanel.tsx`).

## Design decisions

- Rebuilt in the DC8 app's own styling and conventions (dc-* tokens, `Segmented`,
  `BottomSheet`, `SearchInput`, 150 ms ease-out), not ported from the old map's code.
- Stacked landing with "All" as a visible state, plus re-tapping the active floor pill to
  return to the stack. Flat view always shows one floor; "All" from Flat pitches back to 3D.
- Esc closes an open area card first and resets otherwise; Find owns Esc while open. Not
  spelled out in the UI.
- Duplicated facilities are one row per floor that highlights every instance.
- Stacked-floor hover is a light lavender slab tint plus the floor name in 40px muted bold
  text beside the floor (no pill, no lift, no shadow: tried and rejected as noise).
- Legend leads with the click/tap target; copy is "Double click zoom-in".

## Gotchas

- **R3F hover is per hit object, not per group.** Leaving a child mesh fires the parent
  group's `onPointerOut` even if the pointer is still over another child that was already
  hovered (no new `onPointerOver` follows). The level group checks `e.intersections` — R3F
  8.18's `cancelPointer` passes the *new* hits on the out event — for one of its own
  descendants before clearing. Without this the hover dropped over every block, wall and mat.
- **Raycast through holes.** A pointer over a floor's atrium hits the floor beneath. Each
  stacked floor carries `FloorHitPlane`, an invisible `ShapeGeometry` of the slab outline with
  the holes filled (`colorWrite` off). Objects without handlers are still hit because the
  group's handlers make the whole subtree interactive.
- **Coplanar caps z-fight.** Extrusions were double-sided, so a block's bottom cap was
  coplanar with the slab top and shimmered along its edge. Materials are front-side only with
  `polygonOffset` so the outline lines, which lie exactly on the surface edges, win the depth
  test.
- **Outline lines steal hits.** three's default `Line.threshold` is 1 world unit (~45 px);
  every `lineSegments` gets `raycast={noRaycast}`.
- **Reset from an open floor.** `resetRef` tweens before React re-renders, so it aimed at the
  open floor's fit. The view effect leaves `pendingResetRef` up and the stack effect finishes
  the reset with the refitted stack.
- **Pitch and stack change in one commit** (All from Flat): the stack tween is built from the
  current camera, still top-down, and overrode the pitch tween. It now aims at the target
  pitch and start azimuth whenever the pitch is changing.
- **Zoom clamps snap.** `OrbitControls.update()` clamps zoom every frame; `tweenTo` loosens
  the clamps to span both ends and `applyZoomClamps` restores them on landing.
- **Keyboard vs. fields.** The hook is disabled while Find is open and ignores
  input/textarea/contentEditable targets; `F` calls `preventDefault` so the key does not land
  in the freshly focused field.
- **Callback order and the React Compiler lint.** A plain function calling a `useCallback`
  declared later fails `react-hooks/preserve-manual-memoization`; declare callers after.
  `react-hooks/refs` forbids assigning `ref.current` in render: use effects or stable deps.
- **Never a fresh `Set` per render.** `highlighted` is state set once per change.
- **drei `Html` steals the pointer** unless `style={{ pointerEvents: "none" }}`; its
  `zIndexRange` defaults above every overlay.
- **Tailwind arbitrary classes added mid-session** have been missing from the dev CSS after
  HMR. Per-breakpoint bottom offsets use an inline `style` chosen with `useIsDesktop()`.
- **Verification is headless** (`scripts/shot.mjs`, one-off playwright-core scripts in
  `monorepo/scripts/`, deleted after). `window.__mapCamera` / `__mapHover` are published when
  the wrench is on. A 16px pointer-grid scan logging `__mapHover` with the nulls drawn on a
  canvas overlay is the quickest way to see where hover is lost. Material and hover changes
  must also be checked in a real browser: the floor-shadow experiment rendered fine headless
  and wrong in Arc.
- **Not yet handled for production**: Serwist precache will include the three chunk
  (~170 KB gz) and the plan JSON on merge; wire the rest of the rooms in `roomAreas.ts`;
  `Blocks.tsx` (iso demo) is still double-sided.
