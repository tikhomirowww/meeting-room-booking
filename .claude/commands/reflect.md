---
description: Review recent work against docs/ai/lessons.md and propose new lessons, guards and promotions
argument-hint: "[since: e.g. '1 day ago' | '1 week ago' | <commit>]"
---

# Reflect

Run a self-review of recent work and update the project's shared memory, following `docs/ai/memory-guide.md`.

Scope: commits since `$ARGUMENTS` (default: `1 day ago`), plus the current conversation if there is one.

## Steps

1. **Load memory.** Read `docs/ai/lessons.md`, `docs/ai/memory-guide.md` and the Invariants and Gotchas sections of `AGENTS.md`.
2. **Gather evidence.**
   - `git log --since="<scope>" --stat` and `git log --since="<scope>" -p -- src docs` (or `<commit>..HEAD`).
   - Look for `fix:` commits, reverts, commits that touch the same file twice, and tests added after a bug.
   - In the conversation, look for user corrections, wrong assumptions, failed checks and retries.
3. **Classify each finding:**
   - **New lesson:** it meets a trigger from the memory guide and isn't covered yet.
   - **Recurrence:** it matches an existing lesson. Increment `Seen`, and if it's now ×2, propose a promotion.
   - **Missing guard:** a lesson whose guard is only a note. Propose a test, check or code change.
   - **Stale:** a lesson whose guard no longer exists or whose code was removed.
4. **Verify guards exist.** For every lesson you touch, confirm the named file or test actually exists (`grep` or open it). Don't record a guard you haven't seen.
5. **Propose, then apply.** Show a short table (finding → action → file). Apply changes to `docs/ai/lessons.md` (and `AGENTS.md` or `docs/adr/` for promotions) only after the user agrees, or immediately if they asked you to run without confirmation.
6. **Report** in three or four lines: what was learned, what is now guarded, and what still relies on memory alone.

## Rules

- Record the **trap and the why**, not the diff.
- Each lesson must name a guard. If nothing can guard it yet, say so in the lesson.
- Be honest about your own mistakes, because they're the most useful lessons.
- Don't add personal preferences or task progress to `lessons.md`.
