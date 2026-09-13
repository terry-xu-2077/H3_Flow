[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = 8000,
    [switch]$NoReload
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$env:PYTHONPATH = (Join-Path $Root 'backend')

$Arguments = @(
    '-m', 'uvicorn', 'shotmill.app:app',
    '--host', '127.0.0.1',
    '--port', [string]$Port
)
if (-not $NoReload) {
    $Arguments += '--reload'
}

& python @Arguments
exit $LASTEXITCODE
