param(
    [string]$TargetDir = (Join-Path $env:USERPROFILE '.CocosCreator\extensions'),
    [string]$CliIndex = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot 'extensions\cocos-agent'
$target = Join-Path $TargetDir 'cocos-agent'
$configDir = Join-Path $env:USERPROFILE '.cocos-agent'

if (-not (Test-Path -LiteralPath $sourceDir)) {
    throw "Extension directory not found: $sourceDir"
}
if (-not $CliIndex) {
    $CliIndex = Join-Path $repoRoot 'cli\dist\index.js'
}
Push-Location (Join-Path $repoRoot 'cli')
try { npm run build | Out-Host }
finally { Pop-Location }
if (-not (Test-Path -LiteralPath $CliIndex -PathType Leaf)) {
    throw "CLI is not built: $CliIndex. Run 'cd cli; npm run build' first."
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $target | Out-Null
Get-ChildItem -LiteralPath $sourceDir -Force | Copy-Item -Destination $target -Recurse -Force
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
@{
    cliIndex = [IO.Path]::GetFullPath($CliIndex)
    updatedAt = (Get-Date).ToUniversalTime().AddHours(8).ToString('yyyy-MM-ddTHH:mm:ss+08:00')
    version = 'v0.0.0.2-a'
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $configDir 'config.json') -Encoding UTF8
Write-Host "Installed extension: $target"
Write-Host "Configured CLI bridge: $CliIndex"
