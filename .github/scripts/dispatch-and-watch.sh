#!/usr/bin/env bash
#
# Dispatch a workflow in another repo and block until it finishes.
#
# Replaces the third-party balthazar/action-workflow-dispatch action, whose
# repository no longer exists on GitHub ("Unable to resolve action ...,
# repository not found"). Uses the gh CLI, which is preinstalled on the
# GitHub-hosted runners.
#
# Required env:
#   GH_TOKEN  - token with `actions: write` on $REPO
#   WORKFLOW  - workflow file name, e.g. build-and-test.yml
#   REPO      - owner/name of the target repository
#   REF       - branch or tag to run against
set -euo pipefail

: "${GH_TOKEN:?ORG_WORKFLOW_TOKEN is not set for this environment}"
: "${WORKFLOW:?WORKFLOW is required}"
: "${REPO:?REPO is required}"
: "${REF:?REF is required}"

# Fail early with a readable message if the target workflow does not exist,
# rather than surfacing a bare "could not find any workflows named ..." later.
if ! gh workflow view "$WORKFLOW" --repo "$REPO" >/dev/null 2>&1; then
  echo "::error::Workflow '$WORKFLOW' does not exist in $REPO"
  exit 1
fi

latest_run_id() {
  gh run list --repo "$REPO" --workflow "$WORKFLOW" \
    --limit 1 --json databaseId --jq '.[0].databaseId // 0'
}

# Remember the newest run before dispatching, so we can tell the new one apart.
before="$(latest_run_id)"

echo "Dispatching $WORKFLOW on $REPO@$REF"
gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$REF"

# The dispatched run does not appear instantly; poll for it (up to ~2.5 min).
run_id=""
for _ in $(seq 1 30); do
  sleep 5
  candidate="$(latest_run_id)"
  if [ "$candidate" != "0" ] && [ "$candidate" != "$before" ]; then
    run_id="$candidate"
    break
  fi
done

if [ -z "$run_id" ]; then
  echo "::error::Timed out waiting for a new $WORKFLOW run to appear on $REPO@$REF"
  exit 1
fi

echo "Watching run $run_id: $(gh run view "$run_id" --repo "$REPO" --json url --jq .url)"

# --exit-status makes this step fail when the watched run fails, which is the
# behaviour the old action's `wait-for-completion: true` provided.
gh run watch "$run_id" --repo "$REPO" --exit-status
