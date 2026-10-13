# ADR-0003: One validation function for client and server

**Date:** 2026-10-13
**Status:** Accepted

## Context

The rules must be checked on the server (it's the source of truth), and the UI should give instant feedback. Two implementations would drift.

## Decision

All rules live in pure functions in `entities/booking/model/rules.ts`. `validateBooking` returns a list of `{ code, field, message }`, and both the form and the mock server call it.

## Alternatives considered

- **A schema library such as zod.** Good for shapes, but overlaps and "now"-dependent rules would end up in refinements anyway, and this way avoids an extra dependency.
- **Validate only on the server.** Simpler, but every mistake would cost a round trip.

## Consequences

- Rules are unit-tested once, with "now" injected for determinism.
- After a `409` and a refetch, the form highlights the overlap automatically, because it re-validates against fresh data.
- With a real backend the server owns validation, and the shared module becomes the client copy, which must be kept in sync by contract tests.
