# Verification

## Automated

```bash
npm run check   # tsc -b + oxlint + vitest — must pass before a task is done
```

Unit tests cover the business rules. "Now" is fixed in tests (`2030-05-15 10:05`), so they don't depend on the clock.

## In the browser

Run `npm run dev` and walk through:

1. Create a booking by clicking a free slot. A toast appears and the booking shows on the timeline.
2. Edit it by clicking the block, changing the end and saving.
3. Delete it: the confirmation dialog opens, then a toast confirms.
4. **409:** open "Mock API demo scenarios", tick "Conflict on next save" and save a booking. A dialog appears, the colleague's booking shows on the timeline, and the form keeps your values. For a real 409, use two tabs and the same slot.
5. **Load error:** tick "Schedule requests fail" and change the date. You should see the error state, then "Retry" works after you untick it.
6. Past date: read-only, no booking possible.
7. Mobile width (390px): tapping a slot scrolls to the form and focuses Title. There must be no horizontal scroll.
8. Keyboard only: the first Tab shows "Skip to booking form", and the whole flow works without a mouse.

## Accessibility

Run [axe-core](https://github.com/dequelabs/axe-core) on desktop, on mobile, with validation errors shown and with a dialog open. The baseline is **0 violations** (WCAG 2.1 AA + best practices).

## Testing pitfalls

- Playwright `getByLabel('X')` matches substrings case-insensitively. Use `{ exact: true }` or a CSS selector when a label word also appears in hint text (see L-007).
- An empty `<ul>` whose children are absolutely positioned has zero height. Wait for `state: 'attached'`, not `visible`.
- A CDP `Network.setBypassServiceWorker` and `Page.reload({ ignoreCache: true })` do **not** reproduce a real Cmd+Shift+R (see L-008). Emulate an uncontrolled page by overriding `navigator.serviceWorker.controller` instead.
