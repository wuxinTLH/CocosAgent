$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
& git -C $repoRoot config core.hooksPath .githooks
if ($LASTEXITCODE -ne 0) {
    throw "Unable to configure git hooks for $repoRoot"
}
Write-Host "Configured git hooks from $repoRoot\.githooks"
