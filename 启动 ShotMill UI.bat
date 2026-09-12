@echo off
setlocal
chcp 65001 >nul

where powershell >nul 2>nul
if errorlevel 1 (
    echo [ShotMill] 未找到系统 PowerShell。
    echo.
    echo 请检查系统 PATH 后重试。
    pause
    exit /b 1
)

powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-UI.ps1"
set "SHOTMILL_EXIT_CODE=%ERRORLEVEL%"

if not "%SHOTMILL_EXIT_CODE%"=="0" (
    echo.
    echo [ShotMill] UI 开发环境启动失败，退出代码：%SHOTMILL_EXIT_CODE%
    pause
)

exit /b %SHOTMILL_EXIT_CODE%
