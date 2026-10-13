# AI memory and self-reflection

This repo keeps a **shared, versioned memory** for AI agents and humans: [`lessons.md`](lessons.md). Every agent reads it before working, and adds to it when something goes wrong. Because it lives in git, it's reviewed in pull requests and shared by every tool (Claude Code, Codex, Cursor…), not locked in one developer's machine.

## The loop

```
mistake / surprise  →  record a lesson  →  add a guard  →  if it recurs, promote it
                                            (test, check,      (invariant in AGENTS.md,
                                             doc, code)          lint rule, ADR)
```

A lesson isn't finished until something **prevents** the mistake from happening again. A note alone doesn't count.

## When to write a lesson

Write one when any of these happens during a task:

- A test, the type checker or a browser check caught a bug **you** introduced.
- The user corrected your approach or a fact you stated.
- You assumed an API, behavior or file that turned out to be different (a hallucination).
- A verification method gave a false result: it passed when it should have failed, or the other way round.
- The same kind of fix was needed twice.

## What not to write

- Things readable from code or `git log`. Record the *why* and the *trap*, not the diff.
- Task progress or TODOs. Those belong in issues and the README.
- Personal preferences of one developer. Those belong in the agent's local memory, not the repo.
- Duplicates. If a lesson exists, add an occurrence to it instead.

## Format

Append to `lessons.md`, newest last, numbered `L-NNN`:

```markdown
### L-NNN: Short imperative rule

- **Area:** rules | mocks | ui | a11y | testing | tooling
- **What happened:** one or two sentences, concrete.
- **Root cause:** why it happened.
- **Rule:** what to do from now on.
- **Guard:** the test / invariant / doc / code that now prevents it (with a path).
- **Seen:** 2026-10-13 (×1)
```

## Promotion

When a lesson is seen **twice**, or is critical, promote it:

- A rule that must always hold → **Invariants** in `AGENTS.md`.
- An architectural trade-off → a new ADR in `docs/adr/`.
- Something a machine can check → a test or a lint rule. This is the best guard.

Mark the lesson `Promoted → <where>` and keep it, so the history stays.

## Keeping the log small

`lessons.md` is required reading for every task, so its size is a recurring context cost. Keep it to **about 15 active lessons**.

A lesson moves to [`lessons-archive.md`](lessons-archive.md), keeping its number, when either:

- **it's machine-guarded and quiet:** its guard is automated (a test, lint rule, hook or CI check, not a doc) and it hasn't recurred for 30 days; or
- **it's stale:** the code or tool it describes no longer exists.

A recurrence brings an archived lesson back to `lessons.md` with `Seen` incremented. `/reflect` proposes archive moves. Agents read the archive only on demand.

## Reflection

Run `/reflect` (Claude Code: `.claude/commands/reflect.md`; other agents: follow the same steps) at the end of a task or a working session. It reviews recent commits against `lessons.md`, proposes new lessons and promotions, and flags stale ones. Changes to `lessons.md` go through review like code.
