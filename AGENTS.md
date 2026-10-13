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
npm run check   # typecheck + lint + unit, component and integration tests, must pass before a task is done
npm run e2e     # Playwright e2e + axe against a production build
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
8. **FSD imports go downward only**, through a slice's `index.ts`. Same-layer slices don't import each other. Deliberate exceptions, outside the app layers: `mocks/` imports `@/entities/booking/model` directly so the mock server doesn't pull in React Query, and tests may import a slice's internals (e.g. `toastStore`) to observe behavior.

## Conventions

- Everything is in **English**: code, UI text, comments, commits.
- Comments only for a non-obvious *why*.
- Feedback pattern: success → `toast()`; anything needing a decision → `Modal`; field validation → inline under the field.
- Prefer native elements (`<select>`, `<dialog>`, `<input type="date">`). Style with Tailwind in the component; put shared looks in `shared/ui`.
- Accessibility: every field is labelled, errors are linked via `aria-describedby`, and visible text is part of the accessible name (add context with `sr-only`, not a different `aria-label`). The baseline is 0 axe-core violations.
- Conventional Commits: `feat(scope): …`, `fix(a11y): …`, `docs: …`.
- **One folder per component**, with the test next to it:
  ```
  ui/Button/
    Button.tsx
    Button.test.tsx
    index.ts        # export { Button } from './Button'
  ```
  Logic tests are `*.test.ts` (Node), component and hook tests `*.test.tsx` (jsdom). Query by role and accessible name, not by class or test id.

## Gotchas

- **Hard reload bypasses the service worker.** `main.tsx` reloads once if the page is uncontrolled. Don't remove it (L-005).
- **The mock db re-reads `localStorage` on every call**, which is how two tabs share state. Bump `STORAGE_KEY` in `mocks/db.ts` when the seed or shape changes (L-002, L-003).
- `mockControls.readsFail` is persistent on purpose: TanStack Query retries 5xx once (L-004).
- `noUncheckedIndexedAccess` is on, so `arr[0]` is `T | undefined`.
- e2e freezes time at `2030-05-15T10:05Z` (`e2e/fixtures.ts`), and the seed is relative to it. Use `{ exact: true }` for short label names (L-007).
- Mock handler paths are host-agnostic (`*/api/...`) so they match in the browser and in Node (`msw/node` contract tests).
- Integration tests call `setupMockApi()` from `src/test/server.ts`: the mock API runs in Node, data is reset and `Date` is frozen at `NOW` for each test. jsdom lacks `dialog.showModal`, `matchMedia` and `scrollIntoView`, which are polyfilled in `src/test/setup.ts`.

## Memory and self-reflection

This repo has a shared, versioned memory: `docs/ai/lessons.md`.

- **Before work:** read it.
- **During work:** when a check catches your bug, the user corrects you, an assumption turns out wrong or a verification gives a false result, **append a lesson** (`L-NNN`, format in the memory guide). Every lesson must name its **guard**: a test, invariant, doc or code that prevents a repeat.
- **Promotion:** a lesson seen twice moves into an invariant here, an ADR or, ideally, a test or lint rule.
- **After work:** run `/reflect` (`.claude/commands/reflect.md`; other agents follow the same steps) to review recent commits against the lessons.

Record the trap and the why, not the diff. Personal preferences don't belong here.

## Definition of done

1. `npm run check` and `npm run e2e` pass (CI runs both).
2. New or changed behavior has a test at the right level (see the test levels in `docs/verification.md`): rule → `rules.test.ts`; API → `handlers.test.ts`; component → `Component.test.tsx`; layers working together → integration test with `setupMockApi()`; user journey → `e2e/`.
3. A test added to prevent a bug has been **mutation-checked**: break the code, see it fail, restore (L-011).
4. No new axe violations; the keyboard-only flow works.
5. If something went wrong along the way, there's a lesson for it with a guard.
