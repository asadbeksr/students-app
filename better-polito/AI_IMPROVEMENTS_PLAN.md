# AI Improvements Plan

> **Status:** Implemented on branch `feat/ai-pdf-context` (off `main`).
> All steps shipped except explicit Gemini context caching (see B3 — deferred
> with rationale). Health gates green throughout (tsc / next lint / next build);
> 62 vitest specs pass.
> **Focus chosen by user:** reliability & cost + fixing PDF context awareness.
>
> **Shipped commits (in order):**
> 1. `feat: guarantee open-doc extraction + structured chat metadata` (A1/A3/A4)
> 2. `feat: persist extracted open-doc text in Dexie (read-through cache)` (A2)
> 3. `feat: shared callGemini wrapper — 429 retry/backoff + model config` (B1/B4)
> 4. `feat: study-plan structured-output schema + graceful fallback` (B2)
> 5. `perf: cache native PDF payload across chat turns` (B3, scoped)
> 6. `refactor: de-duplicate chat auto-title generation` (B5)
> 7. `fix: unify PDF extractors on the --- Page N --- format` (A5)

---

## Background: current AI surface

| Area | Files |
|---|---|
| Course chat (streaming, PDF-aware, `read_pdf_pages` tool) | `src/app/api/ai/course-chat/route.ts`, `src/stores/chatStore.ts` |
| Generic chat | `src/app/api/ai/chat/route.ts` |
| Summarize | `src/app/api/ai/summarize/route.ts` |
| Study plan | `src/app/api/ai/study-plan/route.ts` |
| Image / video generation | `src/app/api/ai/generate-image/route.ts`, `generate-video/route.ts` |
| PDF extract / convert | `src/app/api/ai/extract-pdf/route.ts`, `convert-pdf/route.ts` |
| Open-doc extraction (client) | `src/components/chat/ChatWindow.tsx` (L77-155) |
| Open-doc cache (in-memory) | `src/lib/stores/coursePortalStore.ts` (`useDocumentContentStore`) |
| Mood / GIF detection | `src/lib/moodDetection.ts` |
| Gemini client | `src/lib/gemini.ts` |
| Prompt builder | `src/lib/prompts.ts` |

Provider: Gemini via `@google/genai`. (`ai` / Vercel AI SDK is installed but
unused by these routes.)

---

## Part A — Fix PDF context awareness ("the AI doesn't know I have a PDF open")

### Root-cause diagnosis (verified in code)

1. **Extraction is owned by the UI, not the data layer.** The effect that
   extracts the open document's text lives in `ChatWindow.tsx` (L77-155) and
   writes to the in-memory `useDocumentContentStore`. If the chat panel is not
   mounted when a PDF is opened, **no extraction happens** — yet `preview`
   (the "a document is open" signal) is set unconditionally
   (`courses/[courseId]/page.tsx` L1166).

2. **`sendMessage` only waits for extraction that is already running.**
   In `chatStore.ts` L322-331, it reads the cache and waits up to 15s **only if
   `cachedDoc?.extracting === true`**. If the cache entry is `null` (extraction
   never started), it proceeds with `openDocumentFullText = null`.

3. **The route then tells the AI it's blind.** With no doc text but a
   `openDocumentUrl`, `course-chat/route.ts` L117-119 injects:
   `"[SYSTEM ERROR: Failed to extract text. Inform the student you cannot read
   the document.]"` → the model says it cannot read a PDF that is open on screen.

4. **`preview` is persisted, the text cache is not.** `useCoursePortalStore`
   uses `persist`; `useDocumentContentStore` does not. After a reload the prompt
   says "Currently Open Document: X" while the text is gone until ChatWindow
   re-extracts — a guaranteed blind window.

5. **Open-doc state travels as English prose, then gets string-matched.**
   The route detects scanned PDFs via
   `openDocumentText.includes('scanned/image-based')` and regexes the page count
   out of a sentence (`route.ts` L91-107). Fragile and locale-dependent.

6. **Two divergent extraction paths.** ChatWindow calls server
   `/api/ai/extract-pdf`; the attachment path uses client-side `extractPdfText`
   (`chatStore.ts` L216). Both must keep the `--- Page N ---` format in lockstep
   for `read_pdf_pages` and the page-window logic to work.

### Proposed changes

- **A1 — Guarantee extraction at send time.**
  In `sendMessage`, when a document is open and not yet cached, *trigger and
  await* extraction (not merely wait-if-running). Extract the
  trigger-and-await logic out of `ChatWindow` into a small shared helper
  (e.g. `lib/openDocument.ts: ensureDocumentExtracted(preview)`) that both the
  ChatWindow effect and `sendMessage` call. Net effect: the AI never sends a
  request blind to an open document.

- **A2 — Persist extracted text in Dexie.**
  Add a `documentText` store keyed by file id (text + pageCount + isScanned +
  extractedAt). The in-memory store becomes a read-through cache over Dexie.
  Survives reloads and chat-closed scenarios. Aligns with the `GOALS.md`
  Dexie-consolidation direction (and could later sit behind a `materialRepo`
  seam from GOALS step 3).

- **A3 — Pass structured open-doc metadata, not prose.**
  Replace the stringly-typed fields with an explicit object on the request:
  ```ts
  openDocument?: {
    name: string;
    url: string;
    pageCount: number;
    currentPage: number | null;
    isScanned: boolean;
    status: 'ready' | 'extracting' | 'failed';
    fullText?: string;   // present when status === 'ready'
  }
  ```
  The route builds the system-prompt section from these fields instead of
  `includes()` / regex. Removes failure modes 5.

- **A4 — Replace the "[SYSTEM ERROR]" prose with real states.**
  - `status: 'extracting'` → prompt tells the model the doc is still loading and
    to ask the student to retry in a moment (no false "I can't read it").
  - `status: 'failed'` → keep the honest "extraction failed" message.
  - `status: 'ready'` → current behavior (text + `read_pdf_pages` tool).

- **A5 — (optional, follow-up) unify the two extraction paths** so attachments
  and open-docs share one extractor and one page-marker format.

### A — acceptance criteria
- Open a PDF with chat closed, then open chat and ask about it → AI reads it.
- Reload mid-session with a PDF open → AI still reads it without re-opening.
- Scanned PDF → native-vision path still triggers (now via `isScanned` flag).
- `read_pdf_pages` tool still resolves pages from the persisted full text.

---

## Part B — Reliability & cost

- **B1 — 429 retry with backoff.**
  Add a shared `callGemini` wrapper in `src/lib/gemini.ts` (or a sibling) that
  retries on 429 / transient errors with exponential backoff + jitter (e.g. 2-3
  attempts). Today `chatStore` shows a friendly rate-limit *message* but never
  retries. Apply the wrapper across all AI routes.

- **B2 — Structured-output schema.** *(shipped for study-plan)*
  `study-plan/route.ts` now uses a Gemini `responseSchema` (in
  `study-plan/studyPlan.ts`), bumps `maxOutputTokens` 2048 → 8192, and
  `parseStudyPlan()` salvages/validates the JSON, returning a 200 fallback
  instead of 500 on a truncated/malformed response.
  MCQ generation (`getMCQGenerationPrompt`) has **no live consumer** in the
  codebase, so its schema is deferred until it's actually wired up.

- **B3 — Gemini context caching for the open document.** *(partially shipped)*
  Shipped: a process-local TTL cache (`src/lib/nativePdfCache.ts`) for the
  fetched + base64-encoded native PDF, so the scanned-doc path no longer
  re-downloads the (up to 15 MB) file from PoliTO and re-encodes it on every
  turn.
  **Deferred — explicit `ai.caches.create` context caching:** the system prompt
  embeds the open page number + a per-page text window, so the cacheable prefix
  changes whenever the student scrolls; flash's min-cache token floor also
  excludes most slide decks; and the streaming path can't be verified without a
  live API key. Implicit caching (on by default for Gemini 2.5 models) already
  covers the stable-prefix case. To enable explicit caching later, first move
  the page number/window out of the cached prefix (into the user turn).

- **B4 — Centralize model selection.**
  One config/default for model ids; route `chat/route.ts` currently hardcodes
  `gemini-flash-latest` and ignores the `model` field, while `course-chat`
  respects it. Fold model handling into the `callGemini` wrapper.

- **B5 — (cleanup, low risk) de-duplicate auto-title generation.**
  The ~25-line title-generation fetch/stream block is copy-pasted 3× in
  `chatStore.ts` (video L450, image L560, normal L728). Extract one helper.
  Not strictly reliability, but removes drift risk between the three copies.

### B — acceptance criteria
- A simulated 429 retries and succeeds without surfacing an error.
- `study-plan` with a truncated/malformed model response degrades gracefully
  (no 500).
- Multi-turn chat over the same PDF reuses cached context (verify via reduced
  token usage / latency).

---

## Sequencing (each step independently shippable) — status

1. **[done] A1 + A3 + A4** — guarantee extraction at send time, structured
   open-doc metadata, honest extracting/failed states.
2. **[done] A2** — persist extracted text in Dexie (read-through cache).
3. **[done] B1 + B4** — `callGemini` wrapper (retry/backoff + model config).
4. **[done] B2** — response schema + graceful fallback for study-plan.
5. **[partial] B3** — native-PDF payload cache shipped; explicit Gemini context
   caching deferred (see B3 above).
6. **[done] B5** — title-gen dedupe.
7. **[done] A5** — unify the two extractors on the `--- Page N ---` format.

## Health gates (must stay green, per GOALS.md)
```
next build      # succeeds
next lint       # passes (errors not tolerated)
tsc --noEmit    # zero errors
```

## Out of scope for this plan
- Mood/GIF detection rework (separate "smarter quality" track).
- Image/video generation features.
- Provider migration (staying on Gemini).
