[CmdletBinding()]
param(
    [switch]$Desktop,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $Utf8NoBom
[Console]::OutputEncoding = $Utf8NoBom
$global:OutputEncoding = $Utf8NoBom
chcp.com 65001 > $null

if ($PSVersionTable.PSEdition -ne 'Core' -or $PSVersionTable.PSVersion.Major -ne 7) {
    throw '请使用 PowerShell 7 运行此脚本。'
}

$ProjectRoot = $PSScriptRoot
$FrontendRoot = Join-Path $ProjectRoot 'frontend'
$UiUrl = 'http://127.0.0.1:1420/dev/ui'

if (-not (Test-Path -LiteralPath (Join-Path $FrontendRoot 'package.json'))) {
    throw "未找到前端工程：$FrontendRoot"
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw '未找到 pnpm。请先安装 Node.js 20+ 与 pnpm 10+。'
}

if (-not (Test-Path -LiteralPath (Join-Path $FrontendRoot 'node_modules'))) {
    Write-Host '首次启动，正在安装前端依赖……' -ForegroundColor Yellow
    & pnpm --dir $FrontendRoot install
    if ($LASTEXITCODE -ne 0) { throw '前端依赖安装失败。' }
}

Write-Host ''
Write-Host 'ShotMill UI 开发环境' -ForegroundColor Yellow
Write-Host "项目：$ProjectRoot"

if ($Desktop) {
    Write-Host '模式：Tauri 桌面壳（支持热更新）'
    Write-Host '按 Ctrl+C 停止。' -ForegroundColor DarkGray
    & pnpm --dir $FrontendRoot tauri dev
    if ($LASTEXITCODE -ne 0) { throw 'Tauri UI 开发环境异常退出。' }
    return
}

Write-Host "地址：$UiUrl"
Write-Host '模式：浏览器 UI 工作台（支持热更新）'
Write-Host '按 Ctrl+C 停止。' -ForegroundColor DarkGray

$BrowserJob = $null
if (-not $NoBrowser) {
    $BrowserJob = Start-Job -ArgumentList $UiUrl -ScriptBlock {
        param($Url)
        for ($Attempt = 0; $Attempt -lt 50; $Attempt++) {
            try {
                Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 1 -UseBasicParsing | Out-Null
                Start-Process $Url
                return
            }
            catch {
                Start-Sleep -Milliseconds 200
            }
        }
    }
}

try {
    & pnpm --dir $FrontendRoot dev
    if ($LASTEXITCODE -ne 0) { throw '浏览器 UI 开发环境异常退出。' }
}
finally {
    if ($BrowserJob) {
        Stop-Job -Job $BrowserJob -ErrorAction SilentlyContinue
        Remove-Job -Job $BrowserJob -Force -ErrorAction SilentlyContinue
    }
}
