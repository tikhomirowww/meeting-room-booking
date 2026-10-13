#!/usr/bin/env bash
# PostToolUse (Edit|Write): lint the edited file at once. Exit 2 sends the errors back to the agent.
set -uo pipefail

command -v jq >/dev/null || { echo "lint-edited-file hook: jq is required (brew install jq / apt install jq)" >&2; exit 1; }

file=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
case "$file" in *.ts | *.tsx) ;; *) exit 0 ;; esac
[ -f "$file" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
case "$file" in "$PWD"/src/* | "$PWD"/e2e/* | src/* | e2e/*) ;; *) exit 0 ;; esac

out=$(npx --no-install oxlint --deny-warnings "$file" 2>&1) || failed=1
boundaries=$(node scripts/check-boundaries.mjs "$file" 2>&1) || failed=1
if [ "${failed:-0}" = 1 ]; then
  printf 'Lint or boundary problems in %s. Fix them before moving on:\n%s\n%s\n' "$file" "$out" "$boundaries" >&2
  exit 2
fi
