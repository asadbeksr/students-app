# Project Goals: `better-polito`

> **Status:** No active goal. Fill in the _Active Goal_ section to start one.

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
