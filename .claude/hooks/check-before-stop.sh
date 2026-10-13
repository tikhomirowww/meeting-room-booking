#!/usr/bin/env bash
# Stop: enforce the Definition of done. The agent can't finish while `npm run check` fails.
set -uo pipefail

command -v jq >/dev/null || { echo "check-before-stop hook: jq is required (brew install jq / apt install jq)" >&2; exit 1; }

input=$(cat)
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

# Nothing to verify when there are no uncommitted changes to code or tooling.
git status --porcelain -- src e2e scripts .claude/hooks package.json '*.config.ts' 'tsconfig*.json' .oxlintrc.json | grep -q . || exit 0

# Skip when nothing changed since the last passing check (the hook fires after every turn).
state=$( { git diff HEAD; git ls-files --others --exclude-standard -z | xargs -0 shasum 2>/dev/null; } | shasum | cut -d' ' -f1)
cache=.claude/.last-passing-check
[ -f "$cache" ] && [ "$(cat "$cache")" = "$state" ] && exit 0

if out=$(npm run check --silent 2>&1); then
  echo "$state" > "$cache"
  exit 0
fi

# Already continued once because of this hook: report and stop instead of looping.
if [ "$(jq -r '.stop_hook_active // false' <<<"$input")" = "true" ]; then
  jq -n '{systemMessage: "npm run check still fails. Stopping anyway; see the output above."}'
  exit 0
fi

reason=$(printf 'npm run check failed (Definition of done in AGENTS.md). Fix it before finishing:\n%s' "$(tail -n 40 <<<"$out")")
jq -n --arg r "$reason" '{decision: "block", reason: $r}'
