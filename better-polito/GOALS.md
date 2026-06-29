# Project Goal: Harden & structure `better-polito`

**Mission:** Make the existing better-polito
 dashboard reliable, internally
consistent, and easy to extend — by fixing real bugs and cleaning up what's
already built, while leaving every working feature and every pixel exactly as
it is.

This is a stabilization mandate, not a redesign. The app already works; the job
is to make it *trustworthy* and *ready for new features*.

## Definition of done

- The app builds clean: `next build` succeeds, `next lint` passes, and
  `tsc --noEmit` reports zero errors.
- No known reproducible bug remains open; each fix is verified against the
  actual flow it affects.
- Code is structured and predictable enough that adding a new feature means
  following an existing pattern, not inventing one.

## In scope

1. **Bug fixing** — Correctness only: broken data flows, unhandled
   errors/edge cases, race conditions, stale-state and async bugs, incorrect
   API handling, and type holes (`any`, unsafe casts, missing null checks).
2. **Cleanup of finished work** — Dead code, unused exports/deps, duplicated
   logic, and leftover scaffolding (`test*.js` at repo root, stray files in
   `plans/`, committed `.DS_Store`, commented-out blocks).
3. **Structure for extensibility** — Consistent file/folder conventions,
   shared types in `lib/types`, reusable hooks/utilities, and clear separation
   between the API layer, the data layer (Dexie / TanStack Query), and the UI.
   Make the seams obvious.

## Out of scope — do not touch

- **No visual changes.** No layout, styling, spacing, color, copy, or
  component-markup changes that alter what the user sees. Refactors must be
  visually identical.
- **No new features**, and no dependency upgrades unless required to fix a
  specific bug.
- **No behavior changes** to anything that currently works as intended.

## Latitude: Moderate

Allowed proactively (no need to ask first), as long as behavior and visuals
stay identical:

- Fix confirmed bugs and remove clearly-dead code.
- Consolidate duplicated logic into shared helpers.
- Reorganize files into consistent patterns and tighten types.

Still requires asking first:

- Anything that could change behavior, visuals, or public/API contracts.
- Deleting a file/feature that looks abandoned but might be intentional.
- Large sweeping rewrites of a module's architecture.

## Operating rules

- **Diagnose before changing.** Find root cause and confirm a real bug before
  editing — don't "fix" things that are merely ugly.
- **Small, reviewable, reversible steps.** One concern per change; explain the
  *why*, not just the *what*.
- **Prove nothing broke.** After each change, re-run build / lint / typecheck
  and, where feasible, exercise the affected flow.
- **When unsure whether something is intentional, ask** rather than assume.
- **Surface, don't silently delete.** If a file or feature looks abandoned or
  contradicts how it was described, flag it before removing.

## Known starting cleanup targets

These are visible from a first pass and safe candidates under the rules above:

- `test-fetch.js`, `test-player.js`, `test-player2.js`, `test-user-code.js`,
  `test_api.js`, `test_manim.js` — ad-hoc scripts at repo root.
- `plans/` — mixes real planning docs (`v1.md`,
  `official-api-inventory.md`) with stray generated HTML
  (`*_graph.html`, `full_solution_zero_to_answer.html`).
- `.DS_Store` committed to the repo.
- Confirm `pnpm-lock.yaml` vs `package-lock.json` — only one package manager
  should own the lockfile.
