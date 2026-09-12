$ErrorActionPreference = 'Stop'

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $Utf8NoBom
[Console]::OutputEncoding = $Utf8NoBom
$global:OutputEncoding = $Utf8NoBom
chcp.com 65001 > $null

$Root = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root 'frontend'
$PackageFile = Join-Path $Frontend 'package.json'
$LockFile = Join-Path $Frontend 'pnpm-lock.yaml'
$Modules = Join-Path $Frontend 'node_modules'
$PackageStamp = Join-Path $Modules '.shotmill-package.sha256'
$TauriManifest = Join-Path $Frontend 'src-tauri\Cargo.toml'

function Write-Step([string]$Text) {
    Write-Host "`n==> $Text" -ForegroundColor Cyan
}

function Fail([string]$Text) {
    Write-Host "`n[ERROR] $Text" -ForegroundColor Red
    exit 1
}

function Refresh-RustPath {
    $CargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
    if ((Test-Path -LiteralPath $CargoBin) -and (($env:Path -split ';') -notcontains $CargoBin)) {
        $env:Path = "$CargoBin;$env:Path"
    }
}

function Get-PackageFingerprint {
    $PackageHash = (Get-FileHash -LiteralPath $PackageFile -Algorithm SHA256).Hash
    $LockHash = if (Test-Path -LiteralPath $LockFile) {
        (Get-FileHash -LiteralPath $LockFile -Algorithm SHA256).Hash
    } else {
        'NO_LOCKFILE'
    }
    return "$PackageHash`:$LockHash"
}

Set-Location $Root

Write-Host 'ShotMill - Development Launcher' -ForegroundColor Green
Write-Host "Project: $Root"

if (-not (Test-Path -LiteralPath $PackageFile)) {
    Fail "Frontend package file was not found: $PackageFile"
}
if (-not (Test-Path -LiteralPath $TauriManifest)) {
    Fail "Tauri manifest was not found: $TauriManifest"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail 'Node.js was not found. Install Node.js LTS and run this launcher again.'
}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Fail 'pnpm was not found. Install pnpm and run this launcher again.'
}

Refresh-RustPath
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Fail 'Rust/Cargo was not found. Install the Rust stable toolchain and run this launcher again.'
}

$ExpectedFingerprint = Get-PackageFingerprint
$InstalledFingerprint = if (Test-Path -LiteralPath $PackageStamp) {
    (Get-Content -LiteralPath $PackageStamp -Raw).Trim()
} else {
    ''
}

if ((-not (Test-Path -LiteralPath $Modules)) -or ($ExpectedFingerprint -ne $InstalledFingerprint)) {
    Write-Step 'Installing/updating frontend dependencies'
    Push-Location $Frontend
    try {
        & pnpm install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) {
            Fail "pnpm install exited with code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
    }
    New-Item -ItemType Directory -Path $Modules -Force | Out-Null
    Set-Content -LiteralPath $PackageStamp -Value $ExpectedFingerprint -NoNewline -Encoding UTF8
} else {
    Write-Host 'Frontend dependencies are up to date.' -ForegroundColor DarkGray
}

$env:CARGO_HTTP_MULTIPLEXING = 'false'
$env:CARGO_NET_RETRY = '2'
$env:CARGO_HTTP_TIMEOUT = '30'

Write-Step 'Starting ShotMill (Tauri development mode)'
Write-Host 'Close the app window or press Ctrl+C here to stop.' -ForegroundColor DarkGray

Push-Location $Frontend
try {
    & pnpm tauri dev
    $ExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

if ($ExitCode -ne 0) {
    Fail "Tauri exited with code $ExitCode."
}
