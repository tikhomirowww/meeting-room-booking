# Verification

## Automated

```bash
npm run check   # tsc -b + oxlint + vitest: types, lint, unit, component and integration tests (~15s)
npm run e2e     # Playwright against a production build, including axe (~40s)
```

Both run in CI (`.github/workflows/ci.yml`) on every push and pull request.

### Test levels

| Level | Where | Environment | What it proves |
|---|---|---|---|
| Unit (logic) | `*.test.ts` next to the code | Vitest project `unit` (Node) | Pure functions: rules, time, HTTP client, mock API contract, storage |
| Unit (components) | `Component/Component.test.tsx` | Vitest project `dom` (jsdom + Testing Library) | A component in isolation, through props and user behavior |
| Integration | `*.test.tsx` for hooks, entities, features, page | `dom` + mock API in Node (`src/test/server.ts`) | Layers together: UI → model → API client → mock server → rules → storage |
| E2E | `e2e/*.spec.ts` | Playwright, production build | The real app in a real browser, plus axe |

Test helpers live in `src/test/`: `setup.ts` (jest-dom, cleanup, jsdom polyfills for `<dialog>`, `matchMedia`, `scrollIntoView`), `render.tsx` (`renderWithProviders`, `renderHookWithProviders`) and `server.ts` (`setupMockApi()`, frozen `NOW`, `TODAY`, `TOMORROW`).

| Suite | File | What it guards |
|---|---|---|
| Business rules | `src/entities/booking/model/rules.test.ts` | Every rule from the spec, numbered after it |
| Mock API contract | `src/mocks/handlers.test.ts` | Status codes 200/201/204/400/404/409/500, error codes, rule 7 on PATCH, title trimming, unknown fields, demo scenarios |
| Mock storage | `src/mocks/db.test.ts` | Stable seed IDs, cross-tab sync, no-storage fallback |
| HTTP client | `src/shared/api/http.test.ts` | Typed errors, 204, non-JSON error bodies, network failures |
| Time utils | `src/shared/lib/time/time.test.ts` | Formats, real calendar dates, local (not UTC) dates |
| UI kit | `src/shared/ui/*/*.test.tsx` | Button (loading, type), Alert (roles), Modal (open/close, Esc, backdrop), Select, Spinner, Toaster (live region, auto-dismiss, hover pause, max 3) |
| Widgets | `src/widgets/day-schedule/ui/*/*.test.tsx` | DateNavigator (day moves, Today, picker), DaySchedule (loading/error/empty/count), Timeline (read-only, free slots, past day, selection) |
| Entity integration | `src/entities/booking/api/*.test.ts(x)` | `bookingApi` lifecycle and typed errors through the whole stack; `useBookingsQuery` sorting, refetch, errors |
| Feature integration | `src/features/**/*.test.tsx` | Form model (slot pick keeps title, 409 keeps input, 404 on edit, edit, read-only), BookingForm UI (options, field errors, focus, 409 dialog, edit mode), delete flow (confirm, cancel, server error, already deleted), demo panel |
| Page integration | `src/pages/booking/ui/BookingPage/BookingPage.test.tsx`, `src/app/App.test.tsx` | Whole screen: book via timeline, edit → delete, date change resets the form |
| E2E: flows | `e2e/booking-flow.spec.ts` | Create, edit, delete, cancel, validation, past/booked options, durations, read-only past date |
| E2E: conflicts | `e2e/conflicts.spec.ts` | 409 dialog with input kept, real 409 between two tabs |
| E2E: states | `e2e/states.spec.ts` | Empty day, load error → Retry, hard-reload recovery |
| E2E: accessibility | `e2e/accessibility.spec.ts` | axe (WCAG 2.1 AA + best practices) on main, errors, dialog and mobile; skip link; mobile focus; no horizontal scroll |

Determinism: unit tests inject "now"; e2e freezes the page clock at `2030-05-15T10:05Z` (UTC), and since the mock server runs in the page, UI and server share that "now". Each e2e test gets a fresh browser context, so it starts from a fresh seed.

**Architecture rules are tested, not just configured.** Import boundaries and model purity are checked by `scripts/check-boundaries.mjs`, and its probe tests (`scripts/check-boundaries.test.ts`) assert that every known bypass is rejected and legitimate imports pass. Hand-probing glob patterns failed twice (L-013), which is why these are now automated tests.

**Mutation-check new guards.** When a test is meant to prevent a bug, break the code once, watch the test fail, then restore (see L-011). Restore from a backup copy, not with `git checkout`, which would also throw away uncommitted work in that file (L-012).

## In the browser

The e2e suite automates these. Walk through them by hand when changing UI. Run `npm run dev`:

1. Create a booking by clicking a free slot. A toast appears and the booking shows on the timeline.
2. Edit it by clicking the block, changing the end and saving.
3. Delete it: the confirmation dialog opens, then a toast confirms.
4. **409:** open "Mock API demo scenarios", tick "Conflict on next save" and save a booking. A dialog appears, the colleague's booking shows on the timeline, and the form keeps your values. For a real 409, use two tabs and the same slot.
5. **Load error:** tick "Schedule requests fail" and change the date. You should see the error state, then "Retry" works after you untick it.
6. Past date: read-only, no booking possible.
7. Mobile width (390px): tapping a slot scrolls to the form and focuses Title. There must be no horizontal scroll.
8. Keyboard only: the first Tab shows "Skip to booking form", and the whole flow works without a mouse.

## Accessibility

`e2e/accessibility.spec.ts` runs [axe-core](https://github.com/dequelabs/axe-core) on desktop, on mobile, with validation errors and with a dialog open. The baseline is **0 violations** (WCAG 2.1 AA + best practices). `label-content-name-mismatch` is experimental in axe, so it's enabled explicitly. Don't drop that line. Automated tools catch roughly half of real issues, so check with a screen reader (VoiceOver: Cmd+F5) for UI changes.

## Testing pitfalls

- Playwright `getByLabel('X')` matches substrings case-insensitively. Use `{ exact: true }` or a CSS selector when a label word also appears in hint text (see L-007).
- An empty `<ul>` whose children are absolutely positioned has zero height. Wait for `state: 'attached'`, not `visible`.
- A CDP `Network.setBypassServiceWorker` and `Page.reload({ ignoreCache: true })` do **not** reproduce a real Cmd+Shift+R (see L-008). Emulate an uncontrolled page by overriding `navigator.serviceWorker.controller` instead.
