param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,
    [string]$CreatorPath = '',
    [switch]$SkipBuild,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$project = [IO.Path]::GetFullPath($ProjectRoot)
$cliIndex = Join-Path $repoRoot 'cli\dist\index.js'
$extensionSource = Join-Path $repoRoot 'extensions\cocos-agent'
$extensionTarget = Join-Path $project 'extensions\cocos-agent'

if (-not (Test-Path -LiteralPath (Join-Path $project 'assets') -PathType Container)) {
    throw "Not a Cocos project: assets directory missing: $project"
}
if (-not (Test-Path -LiteralPath (Join-Path $project 'package.json')) -and -not (Test-Path -LiteralPath (Join-Path $project 'project.json'))) {
    throw "Not a Cocos project: package.json or project.json missing: $project"
}
if (-not $SkipBuild) {
    Push-Location (Join-Path $repoRoot 'cli')
    try { npm run build | Out-Host }
    finally { Pop-Location }
}
if (-not (Test-Path -LiteralPath $cliIndex -PathType Leaf)) {
    throw "CLI build missing: $cliIndex"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $extensionTarget) | Out-Null
$projectRootForCheck = [IO.Path]::GetFullPath($project).TrimEnd([char[]]@([char]92, [char]47))
$extensionTargetForCheck = [IO.Path]::GetFullPath($extensionTarget).TrimEnd([char[]]@([char]92, [char]47))
if (-not $extensionTargetForCheck.StartsWith($projectRootForCheck + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Extension target escaped project root: $extensionTargetForCheck"
}
if (Test-Path -LiteralPath $extensionTarget) {
    Remove-Item -LiteralPath $extensionTarget -Recurse -Force
}
Copy-Item -LiteralPath $extensionSource -Destination $extensionTarget -Recurse -Force
$configDir = Join-Path $env:USERPROFILE '.cocos-agent'
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
@{ cliIndex = [IO.Path]::GetFullPath($cliIndex); version = 'v0.0.0.2-a'; overlay = $true } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $configDir 'config.json') -Encoding UTF8

function Resolve-CocosCreator {
    if ($CreatorPath -and (Test-Path -LiteralPath $CreatorPath -PathType Leaf)) { return [IO.Path]::GetFullPath($CreatorPath) }
    if ($env:COCOS_CREATOR_PATH -and (Test-Path -LiteralPath $env:COCOS_CREATOR_PATH -PathType Leaf)) { return [IO.Path]::GetFullPath($env:COCOS_CREATOR_PATH) }
    $roots = @(
        (Join-Path $env:ProgramFiles 'CocosCreator'),
        (Join-Path $env:ProgramData 'cocos\editors'),
        (Join-Path $env:USERPROFILE '.CocosCreator\editors'),
        'C:\CocosDashboard\editors', 'D:\CocosDashboard\editors', 'E:\CocosDashboard\editors'
    )
    foreach ($root in $roots) {
        if (Test-Path -LiteralPath $root -PathType Container) {
            $found = Get-ChildItem -LiteralPath $root -Filter 'CocosCreator.exe' -File -Recurse -Depth 4 -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) { return $found.FullName }
        }
    }
    return $null
}

$creator = Resolve-CocosCreator
if (-not $creator) {
    if ($DryRun) {
        Write-Output "DRY_RUN creator=not-found project=$project overlay=cocos-agent.overlay"
        exit 0
    }
    Write-Warning "Cocos Creator executable not found. Extension installed at $extensionTarget; install Creator 3.8.x, then rerun this script."
    exit 2
}
if ($DryRun) {
    Write-Output "DRY_RUN creator=$creator project=$project overlay=cocos-agent.overlay"
    exit 0
}
Start-Process -FilePath $creator -ArgumentList @('--project', $project) -WorkingDirectory (Split-Path -Parent $creator)
Write-Output "Started Cocos Creator with Cocos Agent overlay: $project"
