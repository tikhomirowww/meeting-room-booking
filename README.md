# Meeting Room Booking

A UI for booking a single meeting room during the working day (09:00–18:00).

**Demo:** https://meeting-room-booking-tan-nine.vercel.app

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + lint + unit and API contract tests (Vitest)
npm run e2e        # end-to-end + accessibility tests (Playwright + axe) against a production build
npm test           # unit tests only
npm run build      # typecheck + production build
```

There is no backend. The API is emulated in the browser with [MSW](https://mswjs.io), including on the deployed demo. Data is stored in `localStorage`, so it survives page reloads. Use "Reset demo data" to start over.

> A hard reload (Cmd/Ctrl+Shift+R) loads the page without its service worker, so API calls would go to the static host and get a 404. The app detects an uncontrolled page and reloads once to hand control back to MSW. With a real backend this doesn't apply.

## What's done

- Date selection: arrows, "Today" and a native date picker.
- Day timeline showing bookings, past time and a "now" line. Clicking a free slot fills in the form; clicking a booking opens it for editing.
- Create, edit and delete (with confirmation).
- Every business rule from the spec is checked **on both the client and the server** by the same `validateBooking` function.
- Unavailable options in the time selects (past, occupied, invalid duration) are disabled, so an obviously invalid booking is hard to build.
- UI states: loading skeleton, empty day, load error with "Retry", background refresh indicator, form locked while submitting.
- Server error handling: `400` (validation), `404` (booking already deleted), `409` (conflict), `500` and network errors.
- Success feedback via auto-dismissing toasts. Errors that need a decision (conflicts, failed saves, delete confirmation) open in modal dialogs built on native `<dialog>`, which trap focus, close on Esc and return focus to the trigger.
- Responsive layout: on mobile the form sits below the timeline, and picking a slot scrolls the form into view and focuses the title field.
- Accessibility: [axe-core](https://github.com/dequelabs/axe-core) reports 0 WCAG 2.1 AA violations on desktop, on mobile, with validation errors shown and with a modal open. Every field has a label, errors are linked via `aria-describedby`, status messages use `aria-live`, focus is always visible, there's a "Skip to booking form" link, and the whole flow works from the keyboard. Visible text matches the accessible name, so voice control works too.

### Tests

Four levels, **130 Vitest tests + 19 Playwright tests**:

| Level | What's covered |
|---|---|
| **Unit: logic** | Every business rule (numbered after the spec), the mock API contract via `msw/node` (all status and error codes), mock storage, the HTTP client's error handling, time utilities |
| **Unit: components** | Every UI component, tested in isolation with Testing Library: the UI kit (Button, Alert, Modal, Select, Spinner, Toaster) and the widgets (DateNavigator, DaySchedule, Timeline) |
| **Integration** | Layers working together against the mock API: `bookingApi` through the whole stack, `useBookingsQuery`, the form model and `BookingForm` (409 keeps input, 404 on edit), the delete flow, and the whole page |
| **E2E** | Playwright against a production build: user journeys, 409 across two tabs, hard-reload recovery, keyboard and mobile, plus **axe accessibility scans** of four states |

Each component lives in its own folder with its test (`Button/Button.tsx`, `Button.test.tsx`, `index.ts`). Time is frozen in tests, so results don't depend on when they run. Tests that guard known bugs were mutation-checked: the code was broken on purpose to confirm they fail. Everything runs in **GitHub Actions** on every push.

### Handling `409` conflicts

The bottom of the page has a "Mock API demo scenarios" panel:

- **Conflict on next save.** Before saving, the server books the same slot for "a colleague" and responds with `409`. The UI shows a clear message and refetches the schedule. The colleague's booking appears on the timeline and is flagged as an overlap in the form. **The user's input is kept.**
- **Two tabs.** A conflict also happens without the toggle. Open the app in two tabs, pick the same slot and save in one tab, then in the other. The mock storage is shared between tabs, so the second tab gets a real `409`.
- **Schedule requests fail.** While enabled, `GET` responds with `500`, which shows the error state and the "Retry" button.

## Architecture — Feature-Sliced Design

```
src/
  app/        providers, global styles
  pages/      booking — page composition
  widgets/    day-schedule — date navigation, timeline, loading states
  features/   booking-form · booking-delete · mock-controls (demo panel)
  entities/   booking — type, business rules (model), API and query hooks (api)
  shared/     HTTP client and typed errors, time utilities, config, UI kit
  mocks/      mock server (MSW) — backend emulation, outside the app layers
```

- **Business rules** (`entities/booking/model/rules.ts`) are pure functions with no React. The form, the timeline and the mock server all use them, and tests cover every rule in the spec.
- **The network layer** (`shared/api` + `entities/booking/api`) knows nothing about the UI. It throws typed `ApiError`/`NetworkError`, and the UI decides how to present them.
- **Switching to a real API:** set `VITE_API_URL` and `VITE_USE_MOCKS=false`. Feature code does not change.
- **Extension points:** multiple rooms would add `entities/room` + `features/room-select` and extend the query key with the room. Recurring bookings would be a new feature on top of the same rules.

**Stack:** React 19, TypeScript (strict), Vite, Tailwind CSS v4, TanStack Query, MSW, Vitest.

## Working with AI agents

The repo ships its own harness for coding agents, so any agent (Claude Code, Codex, Cursor…) starts with the same knowledge and gets better over time:

- **[`AGENTS.md`](AGENTS.md)** is the entry point: required reading, invariants that must not break, conventions, gotchas and a definition of done. [`CLAUDE.md`](CLAUDE.md) imports it, so there's one source.
- **[`docs/`](docs/)** holds the details agents are pointed to: [architecture](docs/architecture.md) (layers, data flow, where to change what, recipes), [business rules](docs/business-rules.md) (each spec rule mapped to its code, HTTP status and test), [verification](docs/verification.md) and [ADRs](docs/adr/README.md) for the key decisions.
- **Self-reflection memory.** [`docs/ai/lessons.md`](docs/ai/lessons.md) is a shared, versioned log of mistakes made in this repo. Each lesson records what happened, the root cause, the rule and the **guard** that now prevents it (a test, invariant or code). Lessons seen twice get promoted into invariants, ADRs or tests. The `/reflect` command ([`.claude/commands/reflect.md`](.claude/commands/reflect.md)) reviews recent commits against the log. The log holds twelve real lessons from building this project. The tenth was found by `/reflect` itself: a fresh agent spotted an edge case in the hard-reload fix. The eleventh came from mutation-checking the new e2e suite, which showed the accessibility test was silently not guarding what it claimed to.
- **`npm run check`** is the one command an agent runs before calling a task done.

I checked the harness by asking a fresh agent, which had no conversation history and hadn't read any source files, how to forbid weekend bookings. Using the harness alone, it named the right files, explained what updates automatically and warned about the UTC date-parsing trap.

## Decisions on ambiguous points

| Question | Decision |
|---|---|
| Time step | 15 minutes |
| Bookings that have started | Read-only. Their start can't be moved into the past, and deleting a meeting in progress would rewrite history. |
| "Past slot" today | The start must not be earlier than the current minute. At 10:05, 10:00 is unavailable and 10:15 is available. |
| Time zone | The browser's local time: one room, one office |
| Title | Optional, up to 100 characters, trimmed |
| Conflict response | `409` with code `CONFLICT`. Other rule violations return `400 VALIDATION_ERROR`. |

## Not done / next steps

Within the scope of the spec, these were left out to stay inside the timebox:

- Optimistic updates. The list is refetched after each mutation, which is simpler and more reliable for the 409 scenario.
- ESLint rules for FSD boundaries (`eslint-plugin-boundaries`). Layers currently import each other only through public `index.ts` files by convention.
- An indicator for a failed background refresh. If data is already loaded and a refetch fails, the last successful list stays on screen without a warning.

## Future improvements

Beyond the spec, this is what I'd do next for a real product:

- **Authentication and ownership.** Right now anyone can edit or delete any booking. With auth, a booking gets an `ownerId`, and only the owner (and possibly invitees or an admin) can change it. The server would enforce this with `403`, and the UI would show other people's bookings as read-only, reusing the existing locked state.
- **Multiple rooms.** Add `roomId` to `Booking` and to the query key, narrow overlap checks to the same room, and add `entities/room` + `features/room-select`. The timeline and all error handling stay the same. If rooms need different hours or duration limits, the global constants in `shared/config` become a per-room `BookingPolicy` passed to the rules through the existing context argument.
- **Live updates.** Push changes over SSE/WebSocket so other users' bookings appear without a refetch. This makes `409` conflicts rarer, though the server check is still required.
- **Drag to create and resize on the timeline.** Faster for mouse users, but it needs a keyboard alternative (WCAG 2.5.7), which the form already provides, and it must not fight with scrolling on touch devices.
- **Recurring bookings and invitations.** New features built on the same validation rules.

## Time spent

About 1.5 hours of focused work: planning and architecture ~15 min, business rules and tests ~20 min, API layer and mock server ~15 min, UI ~25 min, polish (dialogs, toasts, accessibility audit, selects, hard-reload fix) and README ~25 min. Development was AI-assisted (Claude Code); the conversation log is attached as required.
