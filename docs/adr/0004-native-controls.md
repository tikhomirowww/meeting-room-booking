# ADR-0004: Native form controls and dialogs

**Date:** 2026-10-13
**Status:** Accepted

## Context

Accessibility and responsiveness are explicitly assessed. Time pickers and dialogs are common sources of keyboard and screen-reader bugs in custom implementations.

## Decision

Use native `<select>`, `<input type="date">` and `<dialog>` (via `showModal()`), styled with Tailwind. Clean up the select *content* in the domain layer instead of replacing the control: hide past times, label booked ones and show durations for end times.

## Alternatives considered

- **Radix/Headless UI Select.** Full visual control, but loses the native mobile picker, adds a dependency and needs a fresh accessibility audit.
- **A grid of time chips.** It duplicates the timeline, which already works as a slot picker.

## Consequences

- Focus trapping, Esc and focus return come from the browser. axe-core reports 0 violations.
- The visual style of the open dropdown is up to the OS.
