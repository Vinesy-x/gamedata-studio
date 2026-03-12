@echo off
chcp 65001 >nul
title GameData Studio Installer

echo =========================================
echo   GameData Studio Installer
echo =========================================
echo.

set MANIFEST_URL=https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/manifest-local.xml
set SERVER_URL=https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/file-server.ps1
set STARTER_URL=https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/start-file-server.bat
set ADDIN_DIR=%LOCALAPPDATA%\GameDataStudio
set DATA_DIR=%USERPROFILE%\.gamedata-studio
set MANIFEST_FILE=%ADDIN_DIR%\manifest.xml
set ADDIN_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890

:: Step 1: Create directories
if not exist "%ADDIN_DIR%" mkdir "%ADDIN_DIR%"
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
echo [1/4] Directories OK

:: Step 2: Download manifest
echo [2/4] Downloading manifest...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%MANIFEST_URL%' -OutFile '%MANIFEST_FILE%' -UseBasicParsing"
if not exist "%MANIFEST_FILE%" (
    echo ERROR: Download failed. Check your network.
    pause
    exit /b 1
)
echo       OK

:: Step 3: Download file server
echo [3/4] Downloading file server...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%SERVER_URL%' -OutFile '%DATA_DIR%\file-server.ps1' -UseBasicParsing"
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%STARTER_URL%' -OutFile '%DATA_DIR%\start-file-server.bat' -UseBasicParsing"
echo       OK

:: Step 4: Register add-in
echo [4/4] Registering add-in...
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\Developer\%ADDIN_ID%" /ve /t REG_SZ /d "%MANIFEST_FILE%" /f >nul 2>&1
echo       OK

echo.
echo =========================================
echo   Install complete!
echo =========================================
echo.
echo Usage:
echo   1. Double-click to start file server:
echo      %DATA_DIR%\start-file-server.bat
echo.
echo   2. Restart Excel
echo   3. GameData Studio appears in Home tab
echo.
echo To uninstall:
echo   reg delete "HKCU\Software\Microsoft\Office\16.0\WEF\Developer\%ADDIN_ID%" /f
echo =========================================
echo.
pause
