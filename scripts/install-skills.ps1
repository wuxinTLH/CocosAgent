param(
    [string]$TargetDir = (Join-Path $env:USERPROFILE '.codex\skills')
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot 'skills'

if (-not (Test-Path -LiteralPath $sourceDir)) {
    throw "Skills directory not found: $sourceDir"
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

Get-ChildItem -LiteralPath $sourceDir -Directory | ForEach-Object {
    $target = Join-Path $TargetDir $_.Name
    Copy-Item -LiteralPath $_.FullName -Destination $target -Recurse -Force
    Write-Host "Installed skill: $target"
}

Write-Host "Skills installed to $TargetDir"
