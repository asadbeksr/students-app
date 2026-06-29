# Project Goals: `better-polito`

> **Status:** Active — steps 1–2 shipped (Dexie consolidation + exam-history
> quota fix). Steps 3–4 (repository seam, file-blob storage abstraction) are
> paused awaiting an explicit go-ahead.

---

## Active Goal

- **Mission** — Consolidate the app's persistence onto Dexie/IndexedDB as the
  single local store, kill dead storage code, and introduce a seam that makes a
  future move to a real DB (e.g. Supabase) a contained change rather than a
  rewrite.
- **Definition of done** — Steps 1–2 below shipped with health gates green; the
  localStorage quota bug for exam history closed; no orphaned exam code left.
  Steps 3–4 scoped and started only with explicit go-ahead.
- **In scope** — `src/lib/db.ts`, the stores (`src/stores/*`,
  `src/lib/stores/*`), and `src/lib/exam/*`.
- **Out of scope** — UI/visual changes, the AI/chat behavior, and the
  api-query layer — except where a step unavoidably touches them.
- **Latitude** — **Moderate** for steps 1–2 (dead-code removal + bug fixes).
  **Conservative** for steps 3–4 (architectural seam): plan and confirm before
  rewriting.

### Suggested order (each step independently shippable)

1. **[done]** Delete the dead Dexie exam path — removed `examStore`, `ExamList`,
   `CreateExamDialog`, `examAnalytics`, the `MockExam`/`ExamAttempt`/`MCQQuestion`
   types, and the `deleteCourse` cleanup. The `mockExams`/`examAttempts` legacy
   stores are dropped via Dexie `version(10)` (`null`).
2. **[done]** Port `lib/exam/*` from localStorage → Dexie — new async
   `examAttempts` (active) / `examHistory` (archived) / `examConfigs` stores in
   `version(11)`. Closes the localStorage quota bug; exam history is now durable
   per-browser. (Also deduped the settings init: dropped the stale
   `db.initializeSettings()` in favour of the store's `put`-based init.)
3. **Introduce the repository seam** — one domain at a time
   (`courseRepo`, `examRepo`, `settingsRepo`, `materialRepo`), starting wherever
   you'll touch first. Stores/components depend on the repo, never on `db` or
   `localStorage` directly.
4. **Behind the seam: file blobs → storage abstraction, then Supabase** —
   isolate binary file I/O (`Material.fileData`, `ChatAttachment.fileData`)
   behind `saveFile()` so the cloud impl can upload to a bucket without
   call-site changes.

Steps 1–2 are bug/dead-code fixes within the db/storage/state mandate; steps
3–4 are the larger refactor — get a go-ahead before starting them.

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
