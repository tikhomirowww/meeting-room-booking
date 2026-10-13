# ADR-0001: MSW in the browser as the mock backend

**Date:** 2026-10-13
**Status:** Accepted

## Context

The spec needs a mock API with `GET/POST/PATCH/DELETE /api/bookings`, server-side validation and `409` conflicts. It also needs a deployed demo. The network layer must be separate from the UI and easy to replace with a real API.

## Decision

Mock the API with MSW (Mock Service Worker) running in the browser, in production too, with data in `localStorage`.

## Alternatives considered

- **Next.js Route Handlers with an in-memory store.** On Vercel these are serverless functions that don't share memory, so bookings would randomly disappear in the demo.
- **A mock adapter inside `bookingApi`.** This skips the network entirely, so the HTTP client and error parsing would never run for real.

## Consequences

- The app calls real `fetch('/api/bookings')`. Switching to a backend means setting `VITE_API_URL` and `VITE_USE_MOCKS=false`.
- Two tabs share one store, which gives a genuine cross-tab `409` (see L-002).
- A hard reload bypasses service workers, so `main.tsx` reloads once if the page is uncontrolled (see L-005).
