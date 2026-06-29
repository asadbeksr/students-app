# Project Goals: `better-polito`

> **Status:** No active goal. The stabilization mandate is complete (see
> _Archive_ below). Fill in the _Active Goal_ section to start the next one.

---

## Active Goal

_None yet._ When starting a new goal, fill in:

- **Mission** — one or two sentences: what outcome, and why it matters.
- **Definition of done** — concrete, checkable conditions (commands that must
  pass, behaviors that must hold, bugs that must be closed).
- **In scope / Out of scope** — what to touch and what to leave alone.
- **Latitude** — how much to do without asking (see levels below).

---

## Standing operating rules

These hold for every goal unless a goal overrides them.

- **Diagnose before changing.** Find root cause and confirm a real problem
  before editing — don't "fix" things that are merely ugly.
- **Small, reviewable, reversible steps.** One concern per change; explain the
  *why*, not just the *what*.
- **Prove nothing broke.** After each change, re-run build / lint / typecheck
  and, where feasible, exercise the affected flow.
- **When unsure whether something is intentional, ask** rather than assume.
- **Surface, don't silently delete.** If a file or feature looks abandoned or
  contradicts how it was described, flag it before removing.

### Latitude levels

- **Conservative** — ask before any change beyond the literal request.
- **Moderate** — fix confirmed bugs, remove dead code, consolidate duplicated
  logic, and tighten types proactively, as long as behavior and visuals stay
  identical. Ask before anything that changes behavior, visuals, or API
  contracts; before deleting something that might be intentional; and before
  large architectural rewrites.
- **Broad** — drive larger refactors and feature work with minimal check-ins.

### Health gates (the build must stay green)

```
next build      # succeeds
next lint       # passes (warnings tolerated, errors not)
tsc --noEmit    # zero errors
```

---

## Archive

### ✅ Harden & structure `better-polito` — completed 2026-06-29

**Mission was:** Make the dashboard reliable, internally consistent, and easy
to extend by fixing real bugs and cleaning up finished work — without changing
any working feature or any pixel. A stabilization mandate, not a redesign.

**Outcome — all done criteria met:**

- Health gates green: `next build`, `next lint` (warnings only), and
  `tsc --noEmit` all pass with zero errors.
- Cleanup complete: ad-hoc root `test*.js` scripts, stray `plans/*.html`,
  committed `.DS_Store`, and the duplicate `package-lock.json` are all gone
  (confirmed against `git ls-files`); `plans/` holds only real planning docs;
  `pnpm-lock.yaml` is the sole lockfile.
- Types hardened across the portal, components, and data/API layers; phantom
  `as any` query hooks for unbuilt features removed.
- Last suspected bug diagnosed and closed: `GET /places` 404s on the Prism mock
  (verified — in-spec endpoints 401 instead), but the page degrades gracefully
  to an empty map, so it is a documented limitation, not a defect. Production
  behavior stays unverifiable without a real PoliTO token.

**Known residual (non-blocking, candidates for a future goal):**

- Lint warnings remain (unused `_latex`/`_messageId` params in visual blocks,
  a couple of `react-hooks/exhaustive-deps`). Cosmetic; lint still passes.
- `GET /places` unverified against a real production token.
