param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,
    [string]$CreatorPath = '',
    [switch]$SkipBuild,
    [switch]$DryRun,
    [ValidateRange(1, 120)]
    [int]$ExtensionTimeoutSeconds = 20
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$configDir = Join-Path $env:USERPROFILE '.cocos-agent'
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
$launcherLog = Join-Path $configDir 'launcher.log'

function Write-LauncherLog([string]$Message) {
    $timestamp = (Get-Date).ToUniversalTime().AddHours(8).ToString('yyyy-MM-ddTHH:mm:ss+08:00')
    "$timestamp $Message" | Add-Content -LiteralPath $launcherLog -Encoding UTF8
}

function Write-OverlayStatus([string]$State, [string]$Message = '') {
    if (-not $script:overlayStatusFile) { return }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $script:overlayStatusFile) | Out-Null
    @{
        state = $State
        message = $Message
        version = 'v0.0.0.5-a'
        updatedAt = (Get-Date).ToUniversalTime().AddHours(8).ToString('yyyy-MM-ddTHH:mm:ss+08:00')
    } | ConvertTo-Json | Set-Content -LiteralPath $script:overlayStatusFile -Encoding UTF8
}

try {
    $project = [IO.Path]::GetFullPath($ProjectRoot)
    $cliIndex = Join-Path $repoRoot 'cli\dist\index.js'
    $extensionSource = Join-Path $repoRoot 'extensions\cocos-agent'
    $extensionTarget = Join-Path $project 'extensions\cocos-agent'
    $script:overlayStatusFile = Join-Path $project '.cocos-agent\overlay-status.json'
    Write-LauncherLog "launch requested project=$project"

if (-not (Test-Path -LiteralPath (Join-Path $project 'assets') -PathType Container)) {
    $creatorExe = Get-ChildItem -LiteralPath $project -Filter 'CocosCreator.exe' -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($creatorExe) {
        throw "Selected folder is the Cocos Creator installation folder, not a Cocos project. Choose the project folder that contains an assets directory, then rerun: $project"
    }
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
$configFile = Join-Path $configDir 'config.json'
$existingConfig = @{ cliIndex = [IO.Path]::GetFullPath($cliIndex); version = 'v0.0.0.5-a'; overlay = $true; creatorPath = '' }
if (Test-Path -LiteralPath $configFile -PathType Leaf) {
    try {
        $loadedConfig = Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json
        $existingConfig.cliIndex = if ($loadedConfig.cliIndex) { [string]$loadedConfig.cliIndex } else { [IO.Path]::GetFullPath($cliIndex) }
        $existingConfig.creatorPath = if ($loadedConfig.creatorPath) { [string]$loadedConfig.creatorPath } else { '' }
        if ($loadedConfig.overlay) { $existingConfig.overlay = [bool]$loadedConfig.overlay }
    } catch { $existingConfig = @{ cliIndex = [IO.Path]::GetFullPath($cliIndex); version = 'v0.0.0.5-a'; overlay = $true; creatorPath = '' } }
}
$existingConfig.cliIndex = [IO.Path]::GetFullPath($cliIndex)
$existingConfig.version = 'v0.0.0.5-a'
$existingConfig.overlay = $true
$existingConfig | ConvertTo-Json | Set-Content -LiteralPath $configFile -Encoding UTF8

function Resolve-CocosCreator {
    if ($CreatorPath -and (Test-Path -LiteralPath $CreatorPath -PathType Leaf)) {
        $resolvedCreator = [IO.Path]::GetFullPath($CreatorPath)
        $existingConfig.creatorPath = $resolvedCreator
        $existingConfig | ConvertTo-Json | Set-Content -LiteralPath $configFile -Encoding UTF8
        return $resolvedCreator
    }
    if ($env:COCOS_CREATOR_PATH -and (Test-Path -LiteralPath $env:COCOS_CREATOR_PATH -PathType Leaf)) {
        $resolvedCreator = [IO.Path]::GetFullPath($env:COCOS_CREATOR_PATH)
        $existingConfig.creatorPath = $resolvedCreator
        $existingConfig | ConvertTo-Json | Set-Content -LiteralPath $configFile -Encoding UTF8
        return $resolvedCreator
    }
    $configuredCreator = $existingConfig.creatorPath
    if ($configuredCreator -and (Test-Path -LiteralPath $configuredCreator -PathType Leaf)) { return [IO.Path]::GetFullPath($configuredCreator) }
    $roots = @(
        (Join-Path $env:ProgramFiles 'CocosCreator'),
        (Join-Path ${env:ProgramFiles(x86)} 'CocosCreator'),
        (Join-Path $env:ProgramFiles 'CocosDashboard'),
        (Join-Path ${env:ProgramFiles(x86)} 'CocosDashboard'),
        (Join-Path $env:ProgramData 'cocos\editors'),
        (Join-Path $env:USERPROFILE '.CocosCreator\editors'),
        (Join-Path $env:USERPROFILE 'CocosDashboard\editors'),
        (Join-Path $env:LOCALAPPDATA 'Programs\CocosDashboard'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Cocos Creator'),
        'C:\CocosDashboard', 'D:\CocosDashboard', 'E:\CocosDashboard',
        'C:\CocosDashboard\editors', 'D:\CocosDashboard\editors', 'E:\CocosDashboard\editors',
        'C:\CocosCreator', 'D:\CocosCreator', 'E:\CocosCreator',
        'C:\cocos editor\Creator', 'D:\cocos editor\Creator', 'E:\cocos editor\Creator'
    )
    foreach ($root in $roots) {
        if (Test-Path -LiteralPath $root -PathType Container) {
            $found = Get-ChildItem -LiteralPath $root -Filter 'CocosCreator.exe' -File -Recurse -Depth 4 -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) {
                $existingConfig.creatorPath = $found.FullName
                $existingConfig | ConvertTo-Json | Set-Content -LiteralPath $configFile -Encoding UTF8
                return $found.FullName
            }
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
    throw "Cocos Creator executable not found. Extension installed at $extensionTarget. Set -CreatorPath <CocosCreator.exe>, COCOS_CREATOR_PATH, or add creatorPath to $configFile, then rerun."
}
if ($DryRun) {
    Write-Output "DRY_RUN creator=$creator project=$project overlay=cocos-agent.overlay"
    exit 0
}
Write-OverlayStatus 'starting' 'Cocos Creator is starting and the project extension is being loaded.'
Start-Process -FilePath $creator -ArgumentList @('--project', $project) -WorkingDirectory (Split-Path -Parent $creator)

$deadline = (Get-Date).AddSeconds($ExtensionTimeoutSeconds)
do {
    Start-Sleep -Milliseconds 500
    if (Test-Path -LiteralPath $script:overlayStatusFile -PathType Leaf) {
        $status = Get-Content -LiteralPath $script:overlayStatusFile -Raw | ConvertFrom-Json
        if ($status.state -eq 'ready') {
            Write-LauncherLog "overlay ready project=$project"
            Write-Output "Cocos Agent panel opened in Cocos Creator: $project"
            exit 0
        }
        if ($status.state -eq 'error') {
            throw "Cocos Agent extension failed to load: $($status.message)"
        }
    }
} while ((Get-Date) -lt $deadline)

throw "Cocos Creator started but Cocos Agent did not report a ready panel within $ExtensionTimeoutSeconds seconds. Open Cocos Agent > Overlay manually, then review $script:overlayStatusFile and $launcherLog."
} catch {
    $message = $_.Exception.Message
    Write-OverlayStatus 'error' $message
    Write-LauncherLog "launch failed: $message"
    Write-Error $message
    exit 1
}
