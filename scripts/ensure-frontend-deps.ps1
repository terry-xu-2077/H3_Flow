[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root 'frontend'
$PackageFile = Join-Path $Frontend 'package.json'
$LockFile = Join-Path $Frontend 'pnpm-lock.yaml'
$Modules = Join-Path $Frontend 'node_modules'
$PackageStamp = Join-Path $Modules '.shotmill-package.sha256'

function Get-FrontendFingerprint {
    $PackageHash = (Get-FileHash -LiteralPath $PackageFile -Algorithm SHA256).Hash
    $LockHash = if (Test-Path -LiteralPath $LockFile) {
        (Get-FileHash -LiteralPath $LockFile -Algorithm SHA256).Hash
    } else {
        'NO_LOCKFILE'
    }
    return "$PackageHash`:$LockHash"
}

if (-not (Test-Path -LiteralPath $PackageFile)) {
    throw "Frontend package.json was not found: $PackageFile"
}
if (-not (Get-Command pnpm.cmd -ErrorAction SilentlyContinue)) {
    throw 'pnpm was not found. Install Node.js 20+ and pnpm 10+ first.'
}

$ExpectedFingerprint = Get-FrontendFingerprint
$InstalledFingerprint = if (Test-Path -LiteralPath $PackageStamp) {
    (Get-Content -LiteralPath $PackageStamp -Raw).Trim()
} else {
    ''
}

$Package = Get-Content -LiteralPath $PackageFile -Raw -Encoding UTF8 | ConvertFrom-Json
$UiLibrarySpec = [string]$Package.dependencies.'terry-react-ui-library'
$LockContainsCurrentUiLibrary = $false
if ((Test-Path -LiteralPath $LockFile) -and $UiLibrarySpec) {
    $LockText = Get-Content -LiteralPath $LockFile -Raw -Encoding UTF8
    $LockContainsCurrentUiLibrary = $LockText.Contains($UiLibrarySpec)
}

$NeedsInstall = (-not (Test-Path -LiteralPath $Modules)) -or
    ($ExpectedFingerprint -ne $InstalledFingerprint) -or
    (-not $LockContainsCurrentUiLibrary)

if (-not $NeedsInstall) {
    Write-Host 'Frontend dependencies are up to date.' -ForegroundColor DarkGray
    exit 0
}

Write-Host 'Frontend dependencies changed; updating them before launch...' -ForegroundColor Yellow
Push-Location $Frontend
try {
    & pnpm.cmd install --no-frozen-lockfile
    if ($LASTEXITCODE -ne 0) {
        throw "pnpm install failed with exit code $LASTEXITCODE."
    }
} finally {
    Pop-Location
}

New-Item -ItemType Directory -Path $Modules -Force | Out-Null
$UpdatedFingerprint = Get-FrontendFingerprint
Set-Content -LiteralPath $PackageStamp -Value $UpdatedFingerprint -NoNewline -Encoding UTF8
Write-Host 'Frontend dependencies updated.' -ForegroundColor Green
