param(
    [string]$TargetDir = (Join-Path $env:USERPROFILE '.CocosCreator\extensions')
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot 'extensions\cocos-agent'
$target = Join-Path $TargetDir 'cocos-agent'

if (-not (Test-Path -LiteralPath $sourceDir)) {
    throw "Extension directory not found: $sourceDir"
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Copy-Item -LiteralPath $sourceDir -Destination $target -Recurse -Force
Write-Host "Installed extension: $target"
