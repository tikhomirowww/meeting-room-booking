# Architecture

## Layers (Feature-Sliced Design)

```
src/
  app/        providers (QueryClient), global styles, <Toaster />
  pages/      booking — composes widgets and features, owns the selected date
  widgets/    day-schedule — date navigation, timeline, loading/empty/error states
  features/   booking-form · booking-delete · mock-controls
  entities/   booking — types, business rules (model/), API + query hooks (api/)
  shared/     api (http client, typed errors), config, lib (time, react), ui (kit)
  mocks/      MSW handlers + localStorage "db" — backend emulation, outside the layers
  test/       test setup and helpers (render with providers, mock API in Node), outside the layers
```

Each UI component has its own folder (`ui/Button/Button.tsx`, `Button.test.tsx`, `index.ts`). Slice-level `index.ts` files re-export from those folders, so imports from outside a slice don't change when a component moves.

### Import rules

- A layer may import only from layers **below** it: `app → pages → widgets → features → entities → shared`.
- Slices on the same layer don't import each other. For example, `booking-form` doesn't know about `booking-delete`: the page injects the delete button into the form through the `editActions` slot.
- Cross-slice imports go through the slice's public API (`@/entities/booking`, `@/shared/ui`). Inside a slice, use relative paths.
- Exception: `mocks/` imports `@/entities/booking/model` directly, so the mock server doesn't pull in React Query.

## Data flow

```
User clicks "Book"
  → features/booking-form   useBookingForm.submit(): validateBooking() on the client
  → entities/booking/api    bookingApi.create()
  → shared/api/http         fetch → ApiError | NetworkError
  → [MSW intercepts]        mocks/handlers: validateBooking() again → 201 | 400 | 409
  ← features/booking-form   useSaveBooking: invalidate ['bookings', date]
                            409 → also invalidate + dialog, form values kept
  → widgets/day-schedule    re-renders the timeline from fresh data
```

## Where to change what

| Need to change… | File |
|---|---|
| A booking rule | `src/entities/booking/model/rules.ts` + `rules.test.ts` — see [business-rules.md](business-rules.md) |
| Working hours, duration limits, time step | `src/shared/config/booking.ts` |
| API calls / request contract | `src/entities/booking/api/bookingApi.ts` |
| Cache keys and refetching | `src/entities/booking/api/queries.ts` (`bookingKeys`) |
| Error parsing | `src/shared/api/http.ts`, `src/shared/api/errors.ts` |
| Mock server behavior and status codes | `src/mocks/handlers.ts` |
| Mock storage and seed data | `src/mocks/db.ts` (bump `STORAGE_KEY` when the shape or seed changes) |
| Form behavior (submit, 409, focus) | `src/features/booking-form/model/useBookingForm.ts` |
| Form markup, field errors, selects | `src/features/booking-form/ui/BookingForm/BookingForm.tsx` |
| Timeline rendering | `src/widgets/day-schedule/ui/Timeline/Timeline.tsx` |
| Dialogs, toasts, select, buttons | `src/shared/ui/` |

## UI feedback pattern

| Situation | Pattern |
|---|---|
| Success (created, updated, deleted) | `toast()` from `@/shared/ui` |
| Something the user must decide on or acknowledge (409, 404, failed save, delete confirmation) | `Modal` (native `<dialog>`) |
| Field validation | Inline under the field, linked with `aria-describedby` |
| Page-level state (loading, empty, load error) | Inside `DaySchedule` |

## Recipes

**Add a business rule.** Add a `BookingViolationCode` in `types.ts`, implement it in `validateBooking` with a `field`, and add tests to `rules.test.ts`. The form and the mock server pick it up automatically. For a status other than `400`, map it in `violationResponse` in `handlers.ts`.

**Add a feature.** Create `src/features/<name>/{model,ui}/` with an `index.ts` public API, then compose it in `pages/booking`. Mutations invalidate `bookingKeys.byDate(date)`.

**Switch to a real API.** Set `VITE_API_URL` and `VITE_USE_MOCKS=false`, then remove `features/mock-controls`. Nothing else changes.

**Multiple rooms.** Add `roomId` to `Booking` and `bookingKeys`, scope `findConflicts` to the room, and add `entities/room` + `features/room-select`. If rooms need different hours or limits, turn `shared/config` into a per-room `BookingPolicy` passed through the rules' context argument.
