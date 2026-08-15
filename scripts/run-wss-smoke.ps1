$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
param(
    [Parameter(Mandatory = $true)]
    [string]$PfxFile,
    [string]$Passphrase = 'cocos-agent-test'
)

if (-not (Test-Path -LiteralPath $PfxFile -PathType Leaf)) {
    throw "WSS test certificate not found: $PfxFile"
}

try {
    $env:COCOS_AGENT_TEST_WSS_PFX = [IO.Path]::GetFullPath($PfxFile)
    $env:COCOS_AGENT_TEST_WSS_PASSPHRASE = $Passphrase
    Push-Location (Join-Path $repoRoot 'cli')
    try {
        npm run build
        node --test --test-concurrency=1 dist/tests/gateway.test.js
    }
    finally {
        Pop-Location
    }
}
finally {
    Remove-Item Env:COCOS_AGENT_TEST_WSS_PFX -ErrorAction SilentlyContinue
    Remove-Item Env:COCOS_AGENT_TEST_WSS_PASSPHRASE -ErrorAction SilentlyContinue
}
