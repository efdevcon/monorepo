---
name: figma-impl
description: Implement a Figma frame with spec-table-first pixel verification. Use for any "implement/match this Figma design" task in devcon or event-app — it prevents the recurring miss of exact sizes, paddings, and colors.
---

# Figma implementation workflow

The historical failure mode: implementing from the Figma *screenshot* and estimating values, then needing 2–3 user-flagged correction rounds for things that were exact in the design data (16px vs 20px icons, missing 16px padding, wrong icon color). This workflow makes the exact values an explicit deliverable **before** any code is written.

## 1. Pull the design

Invoke the `figma:figma-design-to-code` skill first (mandatory prerequisite), then call `get_design_context` AND `get_screenshot` for the node.

## 2. Spec table BEFORE editing any file

From the **design context values — never estimated from the screenshot** — write out a markdown table:

| Element | W×H | Padding | Gap | Font (size/weight/family) | Color (exact hex) | Radius | Notes |

Cover every element in the frame, including icon dimensions and stroke widths. If a needed value is missing or ambiguous in the design context, ask the user rather than guessing; otherwise proceed without waiting.

## 3. Implement

Follow the owning project's conventions:

- **devcon**: SCSS modules (no inline styles for anything non-trivial), brand tokens — `#221144` text, no left-border callouts, single quotes/no semicolons.
- **event-app**: double quotes + semicolons, `dc-*` tokens / `trackTheme.ts`, reuse `@/components/Buttons`, AppHeader owns mobile title+back.

**Assets** (icons, illustrations, gems): ask the user to export them from Figma. Never attempt sprite-sheet slicing or background-stripped extraction — it has failed repeatedly.

## 4. Verify

1. `pnpm exec tsc --noEmit` in the project (event-app: `pnpm typecheck`). Both are clean at HEAD, so gate on a zero exit code. In a fresh clone/worktree, `TS2307` errors on `.png`/`.svg` imports just mean `next-env.d.ts` hasn't been generated yet — run `pnpm dev` once.
2. Screenshot affected routes with the checked-in harness (see the project's `verify` skill):
   `node scripts/shot.mjs <route> --port <port>` at 390 + 1440 (add 768 when the design has a tablet frame). Confirm which app owns the port first.
3. **Diff every spec-table row against the screenshots** and report the checklist with a pass/fail per row. Zoom (`--selector`) on anything uncertain. Do not report done with unchecked rows.

## 5. Stop point

Commit locally only when asked. Never push. List any adjacent issues spotted along the way instead of fixing them.
