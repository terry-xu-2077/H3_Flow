[CmdletBinding()]
param(
    [switch]$NoBrowser,
    [ValidateRange(1, 65535)]
    [int]$DevPort = 1420,
    [ValidateRange(1, 65535)]
    [int]$MockApiPort = 8766
)

$ErrorActionPreference = 'Stop'
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $Utf8NoBom
[Console]::OutputEncoding = $Utf8NoBom
$global:OutputEncoding = $Utf8NoBom
chcp.com 65001 > $null

$Root = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root 'frontend'
$Python = Join-Path $Root '.venv\Scripts\python.exe'
$Modules = Join-Path $Frontend 'node_modules'
$UiUrl = "http://127.0.0.1:$DevPort/dev/ui"
$ApiUrl = "http://127.0.0.1:$MockApiPort"
$ApiProcess = $null
$UiProcess = $null

function Fail([string]$Text) {
    Write-Host "`n[ERROR] $Text" -ForegroundColor Red
    exit 1
}

function Test-LocalPort([int]$Port) {
    $Connections = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    return $Connections.Count -gt 0
}

function Stop-ProcessTree($Process) {
    if ($null -eq $Process) { return }
    try {
        $Process.Refresh()
        if (-not $Process.HasExited) {
            & taskkill.exe /PID $Process.Id /T /F *> $null
        }
    } catch {
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
    }
}

$Host.UI.RawUI.WindowTitle = 'ShotMill - Mock UI'
Write-Host 'ShotMill - Mock UI Launcher' -ForegroundColor Green
Write-Host "Project: $Root" -ForegroundColor DarkGray
Write-Host 'Mode: real frontend HTTP client + backend-owned fake API' -ForegroundColor DarkGray

if (-not (Test-Path -LiteralPath $Python)) {
    Fail 'Python environment is missing. Run the normal ShotMill launcher once to install dependencies.'
}
if (-not (Test-Path -LiteralPath $Modules)) {
    Fail 'Frontend dependencies are missing. Run the normal ShotMill launcher once to install dependencies.'
}
if (-not (Get-Command pnpm.cmd -ErrorAction SilentlyContinue)) {
    Fail 'pnpm was not found.'
}
$Pnpm = (Get-Command pnpm.cmd).Source
if (Test-LocalPort $DevPort) {
    Fail "UI port $DevPort is already in use. Close the previous ShotMill window and try again."
}
if (Test-LocalPort $MockApiPort) {
    Fail "Mock API port $MockApiPort is already in use. Close the previous Mock UI session and try again."
}

$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$env:SHOTMILL_BACKEND_URL = $ApiUrl
$env:VITE_SHOTMILL_API_BASE_URL = '/api/v1'

try {
    Write-Host "`n==> Starting fake API: $ApiUrl" -ForegroundColor Cyan
    $ApiProcess = Start-Process `
        -FilePath $Python `
        -ArgumentList @('scripts\mock_api.py', '--port', [string]$MockApiPort) `
        -WorkingDirectory $Root `
        -NoNewWindow `
        -PassThru

    $ApiReady = $false
    for ($Attempt = 0; $Attempt -lt 60; $Attempt++) {
        if ($ApiProcess.HasExited) { Fail "The fake API exited with code $($ApiProcess.ExitCode)." }
        try {
            $Response = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 1
            if ($Response.status -eq 'ok') {
                $ApiReady = $true
                break
            }
        } catch {}
        Start-Sleep -Milliseconds 250
    }
    if (-not $ApiReady) { Fail 'The fake API did not become ready in time.' }

    Write-Host "`n==> Starting UI: $UiUrl" -ForegroundColor Cyan
    $UiProcess = Start-Process `
        -FilePath $Pnpm `
        -ArgumentList @('exec', 'vite', '--host', '127.0.0.1', '--port', [string]$DevPort) `
        -WorkingDirectory $Frontend `
        -NoNewWindow `
        -PassThru

    $UiReady = $false
    for ($Attempt = 0; $Attempt -lt 80; $Attempt++) {
        if ($UiProcess.HasExited) { Fail "The UI exited with code $($UiProcess.ExitCode)." }
        try {
            $Response = Invoke-WebRequest -Uri $UiUrl -UseBasicParsing -TimeoutSec 1
            if ($Response.StatusCode -eq 200) {
                $UiReady = $true
                break
            }
        } catch {}
        Start-Sleep -Milliseconds 250
    }
    if (-not $UiReady) { Fail 'The UI did not become ready in time.' }

    Write-Host "`nMock UI is ready. Data resets when this launcher stops." -ForegroundColor Green
    Write-Host 'Close this window or press Ctrl+C to stop both services.' -ForegroundColor DarkGray
    if (-not $NoBrowser) {
        Start-Process $UiUrl
    }
    Wait-Process -Id $UiProcess.Id
} finally {
    Stop-ProcessTree $UiProcess
    Stop-ProcessTree $ApiProcess
}
