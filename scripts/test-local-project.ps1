param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$project = [IO.Path]::GetFullPath($ProjectRoot)
$agentVersion = (Get-Content -LiteralPath (Join-Path $repoRoot 'VERSION') -Raw).Trim()

function Read-JsonFile([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Required file not found: $Path" }
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

if (-not (Test-Path -LiteralPath (Join-Path $project 'assets') -PathType Container)) { throw "Not a Cocos project: assets directory missing: $project" }
if (-not (Test-Path -LiteralPath (Join-Path $project 'package.json') -PathType Leaf) -and -not (Test-Path -LiteralPath (Join-Path $project 'project.json') -PathType Leaf)) { throw "Not a Cocos project: package.json or project.json missing: $project" }

$rootPackage = Read-JsonFile (Join-Path $repoRoot 'cli\package.json')
$extensionPackage = Read-JsonFile (Join-Path $repoRoot 'extensions\cocos-agent\package.json')
if ($rootPackage.cocosAgentVersion -ne $agentVersion) { throw "CLI version mismatch: VERSION=$agentVersion package=$($rootPackage.cocosAgentVersion)" }
if ($extensionPackage.cocosAgentVersion -ne $agentVersion) { throw "Extension version mismatch: VERSION=$agentVersion package=$($extensionPackage.cocosAgentVersion)" }

if (-not $SkipBuild) {
    Push-Location (Join-Path $repoRoot 'cli')
    try { npm run build | Out-Host; if ($LASTEXITCODE -ne 0) { throw "CLI build failed with exit code $LASTEXITCODE" } } finally { Pop-Location }
}

$launcher = Join-Path $repoRoot 'scripts\launch-cocos-agent.ps1'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -ProjectRoot $project -SkipBuild -DryRun | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Project synchronization failed with exit code $LASTEXITCODE" }

$projectCliRoot = Join-Path $project '.cocos-agent\cli'
$projectCliIndex = Join-Path $projectCliRoot 'dist\index.js'
$projectPackage = Read-JsonFile (Join-Path $projectCliRoot 'package.json')
$projectExtension = Read-JsonFile (Join-Path $project 'extensions\cocos-agent\package.json')
if (-not (Test-Path -LiteralPath $projectCliIndex -PathType Leaf)) { throw "Project-local CLI entry missing: $projectCliIndex" }
if ($projectPackage.cocosAgentVersion -ne $agentVersion) { throw "Project-local CLI version mismatch: expected=$agentVersion actual=$($projectPackage.cocosAgentVersion)" }
if ($projectExtension.cocosAgentVersion -ne $agentVersion) { throw "Project extension version mismatch: expected=$agentVersion actual=$($projectExtension.cocosAgentVersion)" }

$previousProjectRoot = $env:COCOS_AGENT_PROJECT_ROOT
$env:COCOS_AGENT_PROJECT_ROOT = $project
try { $statusJson = & node $projectCliIndex status; if ($LASTEXITCODE -ne 0) { throw "Project-local CLI status failed with exit code $LASTEXITCODE" }; $status = $statusJson | ConvertFrom-Json } finally { $env:COCOS_AGENT_PROJECT_ROOT = $previousProjectRoot }

$normalizedProject = $project.Replace('\', '/').TrimEnd('/')
if ($normalizedProject -match '^[A-Z]:') { $normalizedProject = $normalizedProject.Substring(0, 1).ToLowerInvariant() + $normalizedProject.Substring(1) }
if ([string]$status.projectRoot -ne $normalizedProject) { throw "Project-local CLI resolved the wrong root: expected=$normalizedProject actual=$($status.projectRoot)" }
if ([string]$status.version -ne $agentVersion) { throw "Project-local CLI reported the wrong version: expected=$agentVersion actual=$($status.version)" }

[ordered]@{ ok = $true; projectRoot = $project; version = $agentVersion; cliEntry = $projectCliIndex; extension = (Join-Path $project 'extensions\cocos-agent'); statusProjectRoot = [string]$status.projectRoot; skills = @($status.skills).Count } | ConvertTo-Json
