# One-shot GitHub setup for Windows PowerShell.
# Needs: git and the GitHub CLI (https://cli.github.com) logged in with `gh auth login`.
# Usage: .\scripts\setup-github.ps1 [-Repo mps-playground] [-Visibility public]
param(
  [string]$Repo = "mps-playground",
  [ValidateSet("public","private")][string]$Visibility = "public"
)
$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "Install the GitHub CLI first: https://cli.github.com" }
gh auth status *> $null
if ($LASTEXITCODE -ne 0) { throw "Run: gh auth login" }

if (-not (Test-Path .git)) { git init -b main }
git add -A
git commit -m "Initial commit: MPS Playground"

gh repo create $Repo "--$Visibility" --source=. --remote=origin --push
$owner = gh api user --jq .login
gh api -X POST "repos/$owner/$Repo/pages" -f build_type=workflow 2>$null | Out-Null

Write-Host ""
Write-Host "Done. The first deployment takes about 2 minutes."
Write-Host "Live site: https://$owner.github.io/$Repo/"
