@echo off
chcp 65001 >nul
title GameData Studio Installer

echo =========================================
echo   GameData Studio Installer
echo =========================================
echo.

set MANIFEST_URL=https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/manifest-online.xml
set ADDIN_DIR=%LOCALAPPDATA%\GameDataStudio
set MANIFEST_FILE=%ADDIN_DIR%\manifest.xml
set ADDIN_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890

:: Step 1: Create directory
if not exist "%ADDIN_DIR%" (
    echo [1/3] Creating directory...
    mkdir "%ADDIN_DIR%"
) else (
    echo [1/3] Directory OK
)

:: Step 2: Download manifest
echo [2/3] Downloading manifest...
powershell -Command "Invoke-WebRequest -Uri '%MANIFEST_URL%' -OutFile '%MANIFEST_FILE%'"

if not exist "%MANIFEST_FILE%" (
    echo.
    echo ERROR: Download failed. Check your network.
    pause
    exit /b 1
)
echo       OK

:: Step 3: Register add-in in registry (Developer sideload)
echo [3/3] Registering add-in...
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\Developer\%ADDIN_ID%" /ve /t REG_SZ /d "%MANIFEST_FILE%" /f >nul 2>&1
echo       OK

echo.
echo =========================================
echo   Install complete!
echo =========================================
echo.
echo   1. Close Excel if running
echo   2. Open Excel
echo   3. GameData Studio will appear automatically
echo.
echo To uninstall:
echo   reg delete "HKCU\Software\Microsoft\Office\16.0\WEF\Developer\%ADDIN_ID%" /f
echo   del "%MANIFEST_FILE%"
echo =========================================
echo.
pause
