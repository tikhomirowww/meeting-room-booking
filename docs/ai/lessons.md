# Lessons learned

Shared memory for AI agents and humans. Read before working, append when something goes wrong. See [memory-guide.md](memory-guide.md) for the format and the promotion rules.

These lessons come from building this project. Each one names the guard that now prevents the mistake.

---

### L-001: Check "past time" against now only, not against working hours

- **Area:** rules
- **What happened:** A booking at 08:30 reported two errors: `OUTSIDE_WORKDAY` and `PAST_TIME`. The past-time check used `max(DAY_START, now)`, so any start before 09:00 counted as "past".
- **Root cause:** One helper (`earliestBookableMinute`) was reused for two different questions.
- **Rule:** Each violation answers one question. `PAST_TIME` applies only to today and only relative to the current minute.
- **Guard:** `rules.test.ts` → "1. time within working hours" expects exactly `['OUTSIDE_WORKDAY']`. The check order is documented in `docs/business-rules.md`.
- **Seen:** 2026-10-13 (×1)

### L-002: Mock storage must be re-read on every request

- **Area:** mocks
- **What happened:** With two tabs open, each tab's mock server held its own in-memory copy. Saving in tab B silently overwrote a booking made in tab A, and no `409` happened.
- **Root cause:** MSW handlers run in each page, and `db.ts` loaded `localStorage` once at module start.
- **Rule:** Any shared mock state is read from storage at the start of every operation.
- **Guard:** test `src/mocks/db.test.ts` → "L-002: tabs see each other's writes…" (mutation-checked: fails if `sync()` stops re-reading storage), plus `sync()` in `src/mocks/db.ts` and ADR-0001.
- **Seen:** 2026-10-13 (×1)

### L-003: Persist the seed immediately, or IDs change on every read

- **Area:** mocks
- **What happened:** After L-002, an empty storage meant every `sync()` generated a fresh seed with new random IDs, so editing a seeded booking would return `404`.
- **Root cause:** The fix for L-002 assumed storage was always populated.
- **Rule:** When a fix changes how state is read, re-check the empty and unavailable cases. Seed once and write it right away.
- **Guard:** tests `src/mocks/db.test.ts` → "L-003: seed IDs are stable across reads" and "keeps working in memory when storage is unavailable".
- **Seen:** 2026-10-13 (×1)

### L-004: A one-shot failure can be hidden by automatic retries

- **Area:** mocks, testing
- **What happened:** The "error on next load" demo never showed the error state. TanStack Query retried the `500`, and the retry succeeded because the flag had already been consumed.
- **Root cause:** The retry policy (5xx retried once) wasn't considered when designing the demo.
- **Rule:** When simulating failures, account for every retry layer, so failures must persist while enabled.
- **Guard:** `readsFail` in `src/mocks/controls.ts` is persistent by design and documented under Gotchas in `AGENTS.md`. _Doc-only, no automated test._
- **Seen:** 2026-10-13 (×1)

### L-005: A hard reload bypasses the service worker

- **Area:** mocks
- **What happened:** In production, Cmd+Shift+R showed "Could not load bookings": `GET /api/bookings` returned `404` from Vercel. A normal reload fixed it.
- **Root cause:** By spec, a force reload loads the page without its service worker, so MSW didn't intercept anything.
- **Rule:** With MSW in production, detect an uncontrolled page (`navigator.serviceWorker.controller`) and reload once, guarded against loops. Wait briefly for `controllerchange` first, because on a first visit the worker claims the page slightly after `start()`.
- **Guard:** `enableMocking` in `src/main.tsx`, ADR-0001 and Gotchas in `AGENTS.md`. _Doc-only: checked with an emulated uncontrolled page, no automated test (see L-008)._
- **Seen:** 2026-10-13 (×1)

### L-006: Visible text must be part of the accessible name

- **Area:** a11y
- **What happened:** axe-core flagged `label-content-name-mismatch`. Slots showed "+ 09:00–09:30" but were announced as "Book from 09:00", and booking blocks had an `aria-label` that differed from their text. Voice-control users couldn't activate them by what they saw.
- **Root cause:** `aria-label` was used to add context, which replaced the visible text instead of extending it.
- **Rule:** Don't put an `aria-label` that differs from the visible text on a control. Add context with `sr-only` spans.
- **Guard:** Accessibility requirements in `AGENTS.md`, and the axe baseline of 0 violations in `docs/verification.md`. _Doc-only: axe runs manually, so a regression can slip through. Next step: axe in an automated e2e run._
- **Seen:** 2026-10-13 (×1)

### L-007: Playwright `getByLabel` matches substrings

- **Area:** testing
- **What happened:** Twice, a locator matched the wrong element. `getByLabel('Bookings')` hit a checkbox whose hint mentioned `/api/bookings`, and `getByLabel('Date')` hit text containing "Change the date". This produced a false "empty list" result and a strict-mode failure.
- **Root cause:** By default, name matching is case-insensitive and substring-based.
- **Rule:** Use `{ exact: true }` or a specific selector for short, common words. Treat a surprising test result as a possible locator bug before calling it an app bug.
- **Guard:** Testing pitfalls in `docs/verification.md`.
- **Seen:** 2026-10-13 (×2). Promotion candidate, blocked until e2e tests live in the repo.

### L-008: Make sure the reproduction actually reproduces

- **Area:** testing
- **What happened:** CDP `setBypassServiceWorker` and `Page.reload({ ignoreCache: true })` were used to emulate a hard reload. Neither left the page uncontrolled the way a real Cmd+Shift+R does, so the fix appeared not to work under one and looked untested under the other.
- **Root cause:** It was assumed that an emulation is equivalent to the real browser behavior.
- **Rule:** First confirm that the reproduction triggers the original failure. If it can't, emulate the exact condition (here, `controller === null`) and state the gap honestly.
- **Guard:** Testing pitfalls in `docs/verification.md`.
- **Seen:** 2026-10-13 (×1)

### L-009: Put "why an option is unavailable" in the domain, not the component

- **Area:** rules, ui
- **What happened:** Time selects listed every past slot as disabled, which made for long, noisy lists. To hide past times but keep booked ones visible, the UI needed to know *why* each option was disabled.
- **Root cause:** The domain returned only `disabled: boolean`.
- **Rule:** The domain explains (`reason: past | booked | unavailable`), and the UI decides how to present it. Don't recompute business conditions in components.
- **Guard:** The `TimeOption.reason` assertions in `rules.test.ts`, and `docs/business-rules.md`.
- **Seen:** 2026-10-13 (×1)

### L-010: A loop guard must not become a permanent off switch

- **Area:** mocks
- **What happened:** The L-005 fix set a `sessionStorage` flag before its one-time reload and cleared it only when the worker took control. If the page was still uncontrolled after that reload, the flag stayed set, and every later hard reload in that tab skipped the recovery.
- **Root cause:** The guard was designed to stop an infinite loop, and nobody checked what state it leaves behind when the retry fails.
- **Rule:** A retry guard must reset itself on every outcome: success, give-up and error. Ask what happens *after* the guarded path fails.
- **Guard:** `enableMocking` in `src/main.tsx` clears the flag when it gives up. _Doc-only, no automated test._
- **Found by:** `/reflect`, run by a fresh agent with no conversation history.
- **Seen:** 2026-10-13 (×1)
