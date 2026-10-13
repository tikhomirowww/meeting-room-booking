# ADR-0002: Feature-Sliced Design

**Date:** 2026-10-13
**Status:** Accepted

## Context

The app is small, but booking products grow: rooms, owners, recurrence, invitations. The structure should show where new code goes and keep changes local.

## Decision

Use FSD layers (`app → pages → widgets → features → entities → shared`) with public `index.ts` APIs, and create only the slices that actually have code.

## Alternatives considered

- **Folders by type** (`components/`, `hooks/`, `api/`). Fine at this size, but business rules and UI drift together and there's no import discipline.
- **Full FSD with empty "future" slices.** That's ceremony without content.

## Consequences

- Adding rooms touches `entities/booking`, a new `entities/room`, a new `features/room-select` and the page. The timeline and error handling stay untouched.
- Boundaries are enforced by convention for now. `eslint-plugin-boundaries` is a listed next step.
