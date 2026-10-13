# ADR-0005: Started bookings are read-only

**Date:** 2026-10-13
**Status:** Accepted

## Context

The spec forbids booking past time, but doesn't say what happens to a booking that has already started. Editing one would move its start into the past or violate rule 6.

## Decision

A booking whose start ≤ now is read-only: it can't be edited or deleted on the client (`isBookingLocked`), and the server responds `400 BOOKING_LOCKED`.

## Alternatives considered

- **Allow editing only the end of an ongoing meeting.** Useful (to extend a meeting), but it's a separate rule set and isn't requested.
- **Allow deleting an ongoing meeting.** That rewrites history, and it's unclear whether it should free the remaining time.

## Consequences

- Simple, consistent rule on both sides. Locked bookings are shown greyed out and announced as "read-only".
- "Extend the current meeting" is a natural future feature.
