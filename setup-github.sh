#!/usr/bin/env bash
# One-shot GitHub setup: creates the repo, pushes the code and turns on GitHub Pages.
# Needs: git, and the GitHub CLI (https://cli.github.com) logged in with `gh auth login`.
# Usage: ./scripts/setup-github.sh [repo-name] [public|private]
set -euo pipefail

REPO="${1:-mps-playground}"
VIS="${2:-public}"   # GitHub Pages on private repos needs a paid plan; use public for demos.

command -v gh  >/dev/null || { echo "Install the GitHub CLI first: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Run: gh auth login"; exit 1; }

[ -d .git ] || git init -b main
git add -A
git commit -m "Initial commit: MPS Playground" || true

gh repo create "$REPO" "--$VIS" --source=. --remote=origin --push

OWNER="$(gh api user --jq .login)"
# Enable Pages with "GitHub Actions" as the source (ignore error if already enabled).
gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 || true

echo
echo "Done. The first deployment takes about 2 minutes."
echo "Watch it:  gh run watch"
echo "Live site: https://$OWNER.github.io/$REPO/"
