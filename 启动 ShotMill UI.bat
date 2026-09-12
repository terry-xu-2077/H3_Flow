@echo off
setlocal
chcp 65001 >nul

set "SHOTMILL_PWSH=C:\Program Files\PowerShell\7\pwsh.exe"

if not exist "%SHOTMILL_PWSH%" (
    echo [ShotMill] 未找到 PowerShell 7：
    echo %SHOTMILL_PWSH%
    echo.
    echo 请安装 PowerShell 7 后重试。
    pause
    exit /b 1
)

"%SHOTMILL_PWSH%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-UI.ps1"
set "SHOTMILL_EXIT_CODE=%ERRORLEVEL%"

if not "%SHOTMILL_EXIT_CODE%"=="0" (
    echo.
    echo [ShotMill] UI 开发环境启动失败，退出代码：%SHOTMILL_EXIT_CODE%
    pause
)

exit /b %SHOTMILL_EXIT_CODE%
