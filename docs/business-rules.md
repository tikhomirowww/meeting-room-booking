# Business rules

Every rule from the spec lives in `src/entities/booking/model/rules.ts` and is enforced **twice by the same function**: by the form, for instant feedback, and by the mock server, as the source of truth. Tests are numbered after the spec.

| # | Rule (spec) | Implementation | Violation code → HTTP | Test |
|---|---|---|---|---|
| 1 | Start and end within 09:00–18:00 | `validateBooking`, `getStartOptions`, `getEndOptions` | `OUTSIDE_WORKDAY` → 400 | "1. time within working hours" |
| 2 | `start < end` | `validateBooking` | `START_NOT_BEFORE_END` → 400 | "2. start < end" |
| 3 | Minimum 30 minutes | `validateBooking`, `getEndOptions` | `TOO_SHORT` → 400 | "3. at least 30 minutes" |
| 4 | Maximum 2 hours | `validateBooking`, `getEndOptions` | `TOO_LONG` → 400 | "4. at most 2 hours" |
| 5 | No overlaps; touching boundaries is fine | `intervalsOverlap` (strict `<`), `findConflicts` | `OVERLAP` → **409** | "5. overlaps are rejected…" |
| 6 | No past dates; past slots unavailable today | `isPastDate`, `earliestBookableMinute`, `validateBooking` | `PAST_DATE` / `PAST_TIME` → 400 | "6. past dates…", "6. past time today…" |
| 7 | An edited booking doesn't conflict with itself | `excludeId` in `ValidationContext` | — | "7. an edited booking…" |
| 8 | Server may return 409 even if the UI thought the slot was free | `useSaveBooking` refetches on 409/404, and `useBookingForm` keeps the values and shows a dialog | — | Browser scenario: "Conflict on next save" toggle, or two tabs |

## Decisions on ambiguous points

| Question | Decision | Where |
|---|---|---|
| Time step | 15 minutes | `TIME_STEP_MINUTES` |
| Started bookings | Read-only on client and server | `isBookingLocked`, `BOOKING_LOCKED` → 400 |
| "Past slot" today | Start must be ≥ the current minute | `validateBooking` |
| Time zone | Browser local time | `shared/lib/time` |
| Title | Optional, ≤ 100 chars, trimmed | `TITLE_MAX_LENGTH`, `pickInput` |
| Deleting an already deleted booking | Treated as success | `useDeleteBooking` |

## Order of checks in `validateBooking`

1. Format: date, `HH:mm`, title length. On failure, return immediately, since nothing else can be evaluated.
2. Past date. Return immediately: other errors on a past date are noise.
3. Working hours, `start < end`, then duration. The duration checks are `else if`, so only one is reported.
4. Past time today. This is checked against "now" only, not against working hours (see lesson L-001).
5. Overlaps.

## Time option reasons

`getStartOptions` and `getEndOptions` return `{ value, disabled, reason }`, where `reason` is one of `past`, `booked` or `unavailable`. The domain says **why** an option is unavailable, and the UI decides **how** to show it: the form hides `past`, labels `booked` and hides `unavailable` ends. Keep that split, and don't recompute "is it past" in components.
