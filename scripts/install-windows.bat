@echo off
chcp 65001 >nul
title GameData Studio Installer

:: Check admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo =========================================
echo   GameData Studio Installer
echo =========================================
echo.

set MANIFEST_URL=https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/manifest-online.xml
set ADDIN_DIR=%USERPROFILE%\GameDataStudio
set MANIFEST_FILE=%ADDIN_DIR%\manifest.xml
set SHARE_NAME=GameDataStudio

:: Step 1: Create directory
if not exist "%ADDIN_DIR%" (
    echo [1/4] Creating directory...
    mkdir "%ADDIN_DIR%"
) else (
    echo [1/4] Directory exists, OK
)

:: Step 2: Download manifest
echo [2/4] Downloading manifest...
powershell -Command "Invoke-WebRequest -Uri '%MANIFEST_URL%' -OutFile '%MANIFEST_FILE%'"

if not exist "%MANIFEST_FILE%" (
    echo.
    echo ERROR: Download failed. Check your network connection.
    pause
    exit /b 1
)
echo       Download OK

:: Step 3: Create network share
echo [3/4] Creating network share...
net share %SHARE_NAME% >nul 2>&1
if %errorLevel% equ 0 (
    echo       Share already exists, updating...
    net share %SHARE_NAME% /delete /y >nul 2>&1
)
net share %SHARE_NAME%="%ADDIN_DIR%" /grant:everyone,READ >nul 2>&1
if %errorLevel% neq 0 (
    echo       WARNING: Could not create share, trying alternative...
    net share %SHARE_NAME%="%ADDIN_DIR%" >nul 2>&1
)
echo       Share: \\%COMPUTERNAME%\%SHARE_NAME%

:: Step 4: Register trusted catalog in registry
echo [4/4] Registering trusted catalog...
set REG_PATH=HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\GameDataStudio
reg add "%REG_PATH%" /v Url /t REG_SZ /d "\\%COMPUTERNAME%\%SHARE_NAME%" /f >nul 2>&1
reg add "%REG_PATH%" /v Flags /t REG_DWORD /d 1 /f >nul 2>&1
echo       Registry OK

echo.
echo =========================================
echo   Install complete!
echo =========================================
echo.
echo Next steps:
echo   1. Open Excel (close it first if running)
echo   2. File - Options - Trust Center
echo   3. Click "Trust Center Settings"
echo   4. Click "Trusted Add-in Catalogs"
echo   5. You should see: \\%COMPUTERNAME%\%SHARE_NAME%
echo      If not, add it manually and check "Show in Menu"
echo   6. Click OK, restart Excel
echo   7. Home tab - Add-ins dropdown
echo      or Insert - My Add-ins - SHARED FOLDER
echo   8. Click GameData Studio - Add
echo.
echo Share path: \\%COMPUTERNAME%\%SHARE_NAME%
echo Manifest:   %MANIFEST_FILE%
echo =========================================
echo.
pause
