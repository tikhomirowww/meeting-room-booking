# AGENTS.md

The entry point for AI coding agents (Claude Code reads it through `CLAUDE.md`). Humans should start with [README.md](README.md).

## What this is

A single-page app for booking one meeting room during the working day (09:00–18:00). There is no backend: the API is mocked in the browser with MSW, including in production. Stack: React 19, TypeScript (strict), Vite, Tailwind CSS v4, TanStack Query, MSW, Vitest. Architecture: Feature-Sliced Design.

## Required reading

Read these before changing code. They're short.

| Doc | Read when |
|---|---|
| [docs/ai/lessons.md](docs/ai/lessons.md) | **Always.** Mistakes already made here and how they're prevented |
| [docs/architecture.md](docs/architecture.md) | Always. Layers, import rules, data flow, where to change what, recipes |
| [docs/business-rules.md](docs/business-rules.md) | Touching validation, time options, the form or the mock server |
| [docs/verification.md](docs/verification.md) | Before saying a task is done. Browser scenarios, accessibility, testing pitfalls |
| [docs/adr/](docs/adr/README.md) | Before changing a foundational decision (MSW, FSD, shared validation, native controls, read-only bookings) |
| [docs/ai/memory-guide.md](docs/ai/memory-guide.md) | When something goes wrong (see "Memory and self-reflection" below) |

## Commands

```bash
npm run dev     # http://localhost:5173
npm run check   # typecheck + lint + unit tests — must pass before a task is done
npm test        # unit tests only
npm run build   # production build
```

## Invariants — don't break these

1. **One source of truth for business rules.** `validateBooking` in `src/entities/booking/model/rules.ts` is used by both the form and the mock server. Never re-implement a rule in a component or handler; extend `rules.ts` and add a test.
2. **Rules are pure.** No React, no `fetch`, no `Date.now()` in `rules.ts`. "Now" comes in through the context.
3. **Time is `HH:mm` at the edges and minutes inside** (`toMinutes`/`fromMinutes`). Dates are local `YYYY-MM-DD`: use `toIsoDate`/`parseIsoDate`, never `new Date('YYYY-MM-DD')`, which parses as UTC.
4. **Touching boundaries is not an overlap** (strict `<` in `intervalsOverlap`).
5. **A 409 keeps the user's input.** Show a dialog and refetch, but never reset the form on errors.
6. **Started or past bookings are read-only**, on the client and on the server (ADR-0005).
7. **The network layer knows nothing about the UI.** It throws `ApiError`/`NetworkError`, and components decide how to present them.
8. **FSD imports go downward only**, through a slice's `index.ts`. Same-layer slices don't import each other.

## Conventions

- Everything is in **English**: code, UI text, comments, commits.
- Comments only for a non-obvious *why*.
- Feedback pattern: success → `toast()`; anything needing a decision → `Modal`; field validation → inline under the field.
- Prefer native elements (`<select>`, `<dialog>`, `<input type="date">`). Style with Tailwind in the component; put shared looks in `shared/ui`.
- Accessibility: every field is labelled, errors are linked via `aria-describedby`, and visible text is part of the accessible name (add context with `sr-only`, not a different `aria-label`). The baseline is 0 axe-core violations.
- Conventional Commits: `feat(scope): …`, `fix(a11y): …`, `docs: …`.

## Gotchas

- **Hard reload bypasses the service worker.** `main.tsx` reloads once if the page is uncontrolled. Don't remove it (L-005).
- **The mock db re-reads `localStorage` on every call**, which is how two tabs share state. Bump `STORAGE_KEY` in `mocks/db.ts` when the seed or shape changes (L-002, L-003).
- `mockControls.readsFail` is persistent on purpose: TanStack Query retries 5xx once (L-004).
- `noUncheckedIndexedAccess` is on, so `arr[0]` is `T | undefined`.

## Memory and self-reflection

This repo has a shared, versioned memory: `docs/ai/lessons.md`.

- **Before work:** read it.
- **During work:** when a check catches your bug, the user corrects you, an assumption turns out wrong or a verification gives a false result, **append a lesson** (`L-NNN`, format in the memory guide). Every lesson must name its **guard**: a test, invariant, doc or code that prevents a repeat.
- **Promotion:** a lesson seen twice moves into an invariant here, an ADR or, ideally, a test or lint rule.
- **After work:** run `/reflect` (`.claude/commands/reflect.md`; other agents follow the same steps) to review recent commits against the lessons.

Record the trap and the why, not the diff. Personal preferences don't belong here.

## Definition of done

1. `npm run check` passes.
2. New or changed rules have tests.
3. The browser scenarios in `docs/verification.md` still work, including the 409 demo.
4. No new axe-core violations; the keyboard-only flow works.
5. If something went wrong along the way, there's a lesson for it with a guard.
