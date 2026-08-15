param(
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $repoRoot 'cli')
try {
    npm run lint
    if (-not $SkipTests) {
        npm run test
    }
    npm run docs:check
}
finally {
    Pop-Location
}
