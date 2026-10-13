# Meeting Room Booking

A UI for booking a single meeting room during the working day (09:00–18:00).

**Demo:** https://meeting-room-booking-tan-nine.vercel.app

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for the business rules (Vitest)
npm run build      # typecheck + production build
```

There is no backend. The API is emulated in the browser with [MSW](https://mswjs.io), including on the deployed demo. Data is stored in `localStorage`, so it survives page reloads. Use "Reset demo data" to start over.

## What's done

- Date selection: arrows, "Today" and a native date picker.
- Day timeline showing bookings, past time and a "now" line. Clicking a free slot fills in the form; clicking a booking opens it for editing.
- Create, edit and delete (with confirmation).
- Every business rule from the spec is checked **on both the client and the server** by the same `validateBooking` function.
- Unavailable options in the time selects (past, occupied, invalid duration) are disabled, so an obviously invalid booking is hard to build.
- UI states: loading skeleton, empty day, load error with "Retry", background refresh indicator, form locked while submitting.
- Server error handling: `400` (validation), `404` (booking already deleted), `409` (conflict), `500` and network errors.
- Responsive layout (the form moves below the timeline on mobile) and baseline accessibility: labels on every field, `aria-invalid`/`aria-describedby`, `aria-live` for messages, visible focus, full keyboard support.

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

- E2E tests (Playwright). The scenarios were checked manually and with a one-off script.
- Component tests for the form (Testing Library).
- On mobile, scroll to the form after a slot is clicked.
- Optimistic updates. The list is currently refetched after each mutation, which is more reliable for the 409 scenario.
- ESLint rules for FSD boundaries (`eslint-plugin-boundaries`).
- An indicator for a failed background refresh. If data is already loaded and a refetch fails, the last successful list is shown without a warning.
- `AGENTS.md`/`CLAUDE.md` with a layer map and rules for AI agents.

## Time spent

_TBD_
