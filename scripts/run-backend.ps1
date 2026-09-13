[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$PythonPath,
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,
    [ValidateRange(1, 65535)]
    [int]$Port = 8765,
    [Parameter(Mandatory = $true)]
    [int]$ParentProcessId
)

$ErrorActionPreference = 'Stop'
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $Utf8NoBom
[Console]::OutputEncoding = $Utf8NoBom
$global:OutputEncoding = $Utf8NoBom
chcp.com 65001 > $null

$Host.UI.RawUI.WindowTitle = "ShotMill Backend :$Port"
$LogDir = Join-Path $ProjectRoot '.shotmill\logs'
$LifecycleLog = Join-Path $LogDir 'backend-lifecycle.log'
$BackendProcess = $null

function Write-Lifecycle([string]$Message) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    $Line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff')] $Message"
    Add-Content -LiteralPath $LifecycleLog -Value $Line -Encoding UTF8
}

function Stop-BackendTree {
    if ($null -eq $BackendProcess) { return }
    try {
        $BackendProcess.Refresh()
        if (-not $BackendProcess.HasExited) {
            & taskkill.exe /PID $BackendProcess.Id /T /F *> $null
        }
    } catch {
        try {
            Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
        } catch {}
    }
}

Set-Location $ProjectRoot
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONUNBUFFERED = '1'

Write-Host 'ShotMill Backend' -ForegroundColor Green
Write-Host "API: http://127.0.0.1:$Port" -ForegroundColor DarkGray
Write-Host "Parent launcher PID: $ParentProcessId" -ForegroundColor DarkGray
Write-Host 'This window will close automatically when the ShotMill launcher exits.' -ForegroundColor DarkGray
Write-Host 'Closing this window manually also stops the backend.' -ForegroundColor DarkGray
Write-Host ''

$Arguments = @(
    '-m', 'uvicorn', 'shotmill.app:app',
    '--app-dir', 'backend',
    '--host', '127.0.0.1',
    '--port', [string]$Port,
    '--reload'
)

$ExitCode = 0
try {
    Write-Lifecycle "starting backend on port $Port; launcher pid=$ParentProcessId"
    $BackendProcess = Start-Process `
        -FilePath $PythonPath `
        -ArgumentList $Arguments `
        -WorkingDirectory $ProjectRoot `
        -NoNewWindow `
        -PassThru

    Write-Lifecycle "uvicorn process tree root pid=$($BackendProcess.Id)"
    while ($true) {
        $BackendProcess.Refresh()
        if ($BackendProcess.HasExited) {
            $ExitCode = $BackendProcess.ExitCode
            Write-Lifecycle "backend exited with code $ExitCode"
            break
        }

        if ($null -eq (Get-Process -Id $ParentProcessId -ErrorAction SilentlyContinue)) {
            Write-Lifecycle 'launcher process disappeared; stopping backend process tree'
            Stop-BackendTree
            $ExitCode = 0
            break
        }

        Start-Sleep -Milliseconds 500
    }
} catch {
    Write-Lifecycle "backend runner failed: $($_.Exception.Message)"
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    $ExitCode = 1
} finally {
    Stop-BackendTree
}

exit $ExitCode
