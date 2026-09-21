# 3D venue map (prototype)

The Map tab renders a React Three Fiber scene instead of the old SVG pan-zoom map. This is
a **prototype built on provisional plans and old event data**: the floor-plan SVGs are
working exports whose layer names are still being fixed in Figma, the area descriptions
are placeholders, and the live-session card is exercised against Devcon 7 data. This
document records the pipelines that turn those inputs into what the tab shows, so the next
iteration can swap inputs without re-deriving the chain. Since 2026-09-17 the top-down
redraw in 3D is the only view: the isometric-artwork import demo and the flat (top-down
camera) view were removed.

Code: `src/app/(page-layout)/map/venue-map-3d/` (entry `VenueMap3D.tsx`, mounted by
`src/components/MapPane.tsx` as one of the persistent tab panes). The old map
(`…/map/venue-map/`) and its Devconnect POI data (`src/data/pois.ts`) are dead code kept
for reference; nothing in the 3D map reads them.

## Pipeline 1: floor plans → `plan.generated.json`

```
Figma floor plans (one per floor)
  → export SVG with "Include id attribute"
  → public/maps/devcon-8/source/{G.svg, top-down-geometry-test.svg (L1), L2.svg}
  → pnpm map:build:plan   (scripts/plan-map-build.mjs; the only map build script)
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
8. **Bounds and fit**: per-floor and union ground bounds, plus `isoFit` (screen extent on
   the isometric diagonal). `fit` is legacy since 2026-09-17: the camera fits from `bounds`
   at runtime (`projectedExtent` in `isoMath.ts`), exact at any rotation.

Output shape (`types.ts`): `PlanScene { source, planScale, bounds, fit, levels: PlanLevel[] }`,
`PlanLevel { id, label, name, generatedFrom, viewBox, bounds, fit, shapes: PlanShape[] }`,
`PlanShape { id, level, kind, name, description, tappable, outline, polygons, centroid,
icon, height, fill, stroke }`. Layer ids repeat across floors (walls, `toilets-1`), so every
selection key is `${level}/${id}` (`shapeKey` in `planArea.ts`).

Known input problems (fix in Figma, not in code): L2 `food-area-2`, `cowork-space-1` and
`blue-discussion-corner` duplicate L1 rectangles; L1 says `coffee-station-*` where G/L2 say
`food-area-*`; `Stge-3-Fabrics` is a typo the script tolerates; `press-room`,
`community-hub-4` and `classroom-f` have no description in `areas.json`.

## Pipeline 2: plan → Find / Search / legend catalogue (runtime, `pois.ts`, `legend.ts`)

`buildFindGroups(plan)` runs once per mount (`useMemo`): every `tappable` shape is assigned
a category by id regex (`CATEGORIES`: Stages, Classrooms & breakout, Meeting rooms, Food &
drink, Toilets, Cowork & discussion, Community hubs, Check-in & swag, Fun & rest, Other),
grouped by floor in building order, and same-name shapes on one floor collapse into one
`FindEntry` whose `shapes[]` holds them all (so "Toilets ×4" highlights four footprints).
Each category carries a lucide icon for rows without a theme PNG. Three surfaces read the
same groups:

- **Find** (`FindContent`): the category accordion, browsing only since 2026-09-21.
- **Search** (`SearchContent`, its own pill, sheet and panel since 2026-09-21):
  `searchFind(groups, query)` is a case-insensitive substring match on name or category label.
  `parseFloorQuery` first splits a floor alias off the query (`FLOOR_ALIASES`: "ground floor",
  "gf", "g", "level 1", "l1", "first floor", …); a bare floor lists the whole floor and offers
  a row that opens it, a floor plus text scopes the search. Bare digits are never a floor.
- **Floor legend** (`legend.ts` → `FloorLegend`): `LEGEND` is a per-floor list of specs for what
  the map does not explain by itself. Two chip kinds: `places` (one chip per matching footprint,
  theme icon + short name — the name up to " - ", so "Stage 1", not "Stage 1 - Fans") and
  `swatch` (ONE chip for every matching footprint, a rounded square in the footprints' fill +
  a label, for the colour-coded rooms with no icon). Today: G → Decompression Zone, Hacker Cave,
  Playground, Registration, Swag Station; L1 → the seven stages + "Classrooms" swatch; L2 → Blue
  Discussion Corner + "Breakout rooms", "Meeting rooms", "Speakers Space" swatches.
  `buildFloorLegends(plan)` gives, per floor, the entries in spec order; floors with no entries
  show no legend. Tapping a chip runs the Find-pick path (a swatch chip highlights every room of
  that colour). Surfacing something else is one spec line. The rewrite carries it on its area
  catalogue.

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

## Removed: the isometric artwork import (2026-09-17)

`scripts/iso-map-build.mjs`, `scene.generated.json` (2.5 MB), `Blocks.tsx`, `Props.tsx`,
`Slab.tsx`, `svgLayer.ts`, `SourceToggle.tsx`, `?source=iso` and the `seed` / `prop` /
`height` fields of `areas.json` are gone (commit history has them; the memory note records
why the import of the Figma isometric illustration did not work). The flat top-down camera
(`ViewToggle`, `MapView`) went in the same round: 3D is the only view.

## How the pipelines meet on screen

- **`VenueMap3D`** owns `settings` (`level` or `null` for the stack, tuning values),
  `selected`, `highlighted` (a found group), `focus` (camera target), and the panel state
  (`panel`: `"find" | "search" | null`, one open at a time, plus the search query).
  `select(area)` is the one path that also clears the group. `showShapes()` is the deep
  link's body factored out and is what Find, Search and the floor legend use: opens the
  floor, selects the member nearest the group's centre, highlights the rest, and focuses
  the camera (`CameraFocus.bounds` makes the rig fit a group between the floor fit and the
  single-footprint zoom).
- **`Scene` → `LevelStack` → `PlanShapes` / `PlanIcons`**: `LevelStack` positions the floors
  (stack around y = 0, or the chosen floor at 0 with the others parked off-screen) and tweens
  changes on the 800 ms `LEVEL_SWITCH_MS` clock. In the stack each floor group carries the
  handlers, a `FloorHitPlane` and a `FloorLabel` (`FloorHover.tsx`): the short label
  ("G", "L1") is always visible 24px right of the right-most footprint corner and the other
  floors' labels dim to 30 % while one floor is hovered; 40px on desktop, 24px on phones.
  Since 2026-09-21 the label is a button: clicking it opens the floor (`onSelectLevel`) and
  hovering it hovers the floor (`setHovered("level:<id>")`, so the slab tints and the other
  labels dim exactly as with the pointer over the floor). Only the button takes the pointer;
  the drei `Html` wrapper stays `pointer-events: none`.
  On phones (`useIsDesktop` false, passed into the scene as `desktop`) the stacked home view's
  orbit target sits `PHONE_SHIFT_PX` (28) screen px further right along the camera's right
  vector (`homeTarget` in `CameraRig`), so the stack sits left of centre and the labels clear
  the screen edge; reset and the stack refit share it. A single floor has no labels and is
  centred (2026-09-18).
- **`CameraRig`**: orbit with the polar angle pinned to the isometric tilt, start azimuth
  `START_AZIMUTH` = 25° left of the (1, 1, 1) diagonal (20°; `isoMath.ts`), azimuth clamped
  75° left / 85° right of it (the same absolute range as before the turn), fit from the
  ground bounds via `projectedExtent` (stack spread included), zoom to cursor, double-tap
  zoom, and every programmatic move a `tweenTo` sharing the floors' clock. Mouse: drag
  rotates, right-drag pans. Touch: one finger pans, two fingers rotate and pinch-zoom
  (`TOUCH.PAN` / `TOUCH.DOLLY_ROTATE`).
- **Controls** (all 44px tall since 2026-09-21; 16px labels since the same evening): `FloorSlider` bottom-right
  (vertical 44px track L2 / L1 / G with 40px stops, press-and-hold and drag slides through the
  floors, a clean tap on the active stop returns to the stack, "All" under it: white like the
  active stop when stacked, the track's fill otherwise), the `ControlPill`s "Find" and
  "Search" side by side bottom-left (the whole bottom row fades out and goes `inert` on
  phones while the area card covers it), the top strip (`TopStrip` in `ControlsLegend.tsx`:
  under the status bar on phones, centred under the header from `lg`) holding
  `ControlsLegend` while the floors are stacked (phones: fades after the first gesture and
  returns with the stack) and `FloorLegend` while a floor with legend entries is open (both
  fade while the card or a panel is open), the header's `OfflineIndicator` top-right on
  phones, `MapSheet` (phones, house `BottomSheet`) / `MapPanel` (desktop, stays mounted,
  `inert` when closed; opening focuses the search field or, for Find, the first category row via
  `data-autofocus` so the arrow keys work at once) as the shells for `FindContent` and
  `SearchContent` (one panel open at a time; the shortcuts stand down while one is open),
  `AreaCard` (theme icon — stages in the disc on the top edge, everything else inline left of the
  text — name, plain floor line, blurb, live session; a group pick parks the desktop card
  bottom-centre so every highlighted footprint stays visible), `useMapShortcuts` (1 / 2 / 3 open G / L1 / L2, F opens Find, `/` opens
  Search, A or Esc close the card then reset; A is not advertised). Debug (desktop only since 2026-09-17; both
  tools are `hidden lg:flex` on phones): the wrench (`DebugToggle`, `left-6 top-[80px]`) toggles
  the tuning panel, drei `<Stats>`, `window.__mapCamera`, `window.__mapHover` and
  `window.__mapControls` (the OrbitControls instance); the app-wide dev trigger docks under
  it on `/map` (`appDebugEnabled()` in `components/DebugPanel.tsx`, offsets hardcoded against
  `DebugCorner`: 136 / 192px).
- **No mobile header bar on `/map`** (2026-09-17): `AppHeader`'s `routeChrome` marks the route
  `bare`, so the 56px glass bar is `hidden` below `lg` and the map runs full-bleed under the
  status bar (`--safe-top`); the desktop nav is unchanged. Hidden, not unmounted: the
  `#header-actions` portal target inside the bar must keep its DOM node, because the persistent
  tab panes look it up once on mount (a trip through `/map` used to leave Home's sign-in circle
  and the Schedule / Speakers pills portalled into a detached element until reload).

## Design decisions

- Rebuilt in the DC8 app's own styling and conventions (dc-* tokens, `FloorSlider`,
  `BottomSheet`, `SearchInput`, 150 ms ease-out), not ported from the old map's code.
- Stacked landing with "All" as a visible state, plus re-tapping the active floor stop to
  return to the stack. The floor selector is a vertical slider since 2026-09-17 (press,
  hold and drag through the floors), bottom-right on every breakpoint.
- 3D is the only view (2026-09-17): the flat top-down camera and the iso import are gone.
- The start view is turned 25° left of the isometric diagonal (2026-09-17); the rotation
  range is unchanged in absolute terms.
- Phones: one finger pans, two fingers rotate (2026-09-17). Desktop: drag rotates, right-drag pans.
- Esc or A closes an open area card first and resets otherwise; an open Find or Search panel
  owns Esc. The legend shows `Esc` as "All floors", `F` as "Find", `/` as "Search" and `1 2 3`
  as "Floors"; A is unlisted.
- Floor labels are always visible in the stack (short form), dimming the non-hovered ones,
  and are clickable (2026-09-21).
- Duplicated facilities are one row per floor that highlights every instance.
- Stacked-floor hover is a light lavender slab tint (no pill, no lift, no shadow: tried and
  rejected as noise).
- Legend leads with the click/tap target; copy is "Double click zoom-in". It sits at the top
  of the map since 2026-09-17.
- **Feedback round 2026-09-21** (Scott): controls 44px (was 40; 48 was asked, 44 agreed),
  text stays 14px for now; Search is its own surface beside Find (Find browses, Search types)
  so each can be refined on its own; the floor legend takes the top strip on every breakpoint
  once a floor is open, listing only what the map does not explain by itself (stages first,
  theme icon + name, tappable, hidden on floors with nothing to list); the area card names
  its floor. Same-day follow-up: floor line is plain text (an icon beside it was noise); legend
  covers G (five icon chips) and L2 (discussion corner + colour swatches for breakout / meeting
  rooms / speakers space, an experiment with swatches for colour-coded rooms) and L1 gets a
  "Classrooms" swatch; stage chips drop the theme suffix; `F` opens Find; the control pills get
  4px more padding on the label side (`pl-3 pr-4`) so they don't read lopsided. Evening round: labels 16px
  (Find, Search, All, slider stops); Find keyboard-ready on open (first row focused, no field to
  autofocus any more); group picks (Find/Search/legend, e.g. Coffee Station ×3) put the desktop
  card bottom-centre instead of beside a footprint; non-stage cards show the theme icon inline
  left of the text, stages keep the disc.
- Known limitation: the phone Search sheet cannot autofocus its field (the sheet mounts on
  open; iOS only raises the keyboard for a focus() made synchronously inside the tap), so the
  first tap on the field raises it. If testers mind, keep the search content mounted like
  `HeaderSearchDrawer` does.

## Gotchas

- **R3F hover is per hit object, not per group.** Leaving a child mesh fires the parent
  group's `onPointerOut` even if the pointer is still over another child that was already
  hovered (no new `onPointerOver` follows). The level group checks `e.intersections` — R3F
  8.18's `cancelPointer` passes the *new* hits on the out event — for one of its own
  descendants before clearing. Without this the hover dropped over every block, wall and mat.
- **Unmounting objects fire no pointer-out.** Opening a floor removes the stack handlers and hit
  planes; the hovered floor would stay hovered (pointer cursor stuck). `LevelStack` clears the
  hover on every level change.
- **A grab must abandon a pending reset.** `pendingResetRef` is otherwise only cleared when a
  tween lands; interrupting the reset tween left it up and the next floor change finished the
  reset instead of keeping the user's rotation. The controls' `start` handler clears it.
- **Breakpoint-dependent layout goes in CSS, not `useIsDesktop()`.** The hook is `false` until
  hydration, so an inline style chosen by it paints the phone value first and jumps. The
  bottom wrapper and the legend's key chips use `lg:` classes; `useIsDesktop()` only chooses
  which Find shell mounts (invisible while closed).
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
  open floor's fit. It leaves `pendingResetRef` up and the stack effect finishes the reset
  with the refitted stack.
- **Fit margin.** With the exact `projectedExtent` fit, 0.9 put the stack's top edge under
  the header (the canvas runs under it); `FIT_MARGIN` is 0.82.
- **Zoom clamps snap.** `OrbitControls.update()` clamps zoom every frame; `tweenTo` loosens
  the clamps to span both ends and `applyZoomClamps` restores them on landing.
- **Find and Search are keyboard-navigable** (2026-09-17): the arrows walk every row in DOM
  order via a roving-focus handler (`listRef.querySelectorAll("button")`); in `FindContent`
  ArrowRight / ArrowLeft open / close a category (`data-category`); in `SearchContent`
  ArrowDown from the field enters the list, ArrowUp from the first row returns to the field,
  and a printable key or Backspace on a row re-focuses the field so the keystroke continues
  the search. Enter activates. Focus reads like hover (`focus-visible:bg-dc-purple-wash`).
- **Keyboard vs. fields.** The hook is disabled while a panel is open and ignores
  input/textarea/contentEditable targets; `/` calls `preventDefault` so the key does not land
  in the freshly focused field (or open Firefox's quick find).
- **Callback order and the React Compiler lint.** A plain function calling a `useCallback`
  declared later fails `react-hooks/preserve-manual-memoization`; declare callers after.
  `react-hooks/refs` forbids assigning `ref.current` in render: use effects or stable deps.
- **Never a fresh `Set` per render.** `highlighted` is state set once per change.
- **drei `Html` steals the pointer** unless `style={{ pointerEvents: "none" }}`; its
  `zIndexRange` defaults above every overlay.
- **Tailwind arbitrary classes added mid-session** have once been missing from the dev CSS after
  HMR; prefer classes that already exist in the tree (`bottom-[calc(var(--nav-clearance)+12px)]`)
  and restart the dev server if a new one does not apply.
- **Verification is headless** (`scripts/shot.mjs`, one-off playwright-core scripts in
  `monorepo/scripts/`, deleted after). `window.__mapCamera` / `__mapHover` / `__mapControls`
  are published when the wrench is on. **Synthetic multi-touch** goes through a CDP session
  (`Input.dispatchTouchEvent`); give every touch point a distinct `id`, and keep the fingers
  clear of the open debug panel (a finger on one of its range inputs never reaches the
  canvas, which looked like OrbitControls ignoring the second finger). A 16px pointer-grid scan logging `__mapHover` with the nulls drawn on a
  canvas overlay is the quickest way to see where hover is lost. Material and hover changes
  must also be checked in a real browser: the floor-shadow experiment rendered fine headless
  and wrong in Arc. Turn the wrench off again before driving the desktop Find panel: the
  open tuning panel overlaps it and intercepts the clicks (dev-only, accepted).
- **Rewrite plan**: `docs/venue-map-rewrite-plan.md` is the living plan for rebuilding the
  map when the real SVGs arrive. Update its feature checklist and changelog with every map
  change, alongside this file.
- **Not yet handled for production**: Serwist precache will include the three chunk
  (~170 KB gz) and the plan JSON on merge; wire the rest of the rooms in `roomAreas.ts`.
