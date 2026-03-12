@echo off
chcp 65001 >nul
rem GameData Studio - Windows Install Script

echo =========================================
echo   GameData Studio Install
echo =========================================
echo.

set MANIFEST_URL=https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/manifest-online.xml
set WEF_DIR=%LOCALAPPDATA%\Microsoft\Office\16.0\Wef
set MANIFEST_FILE=%WEF_DIR%\manifest.xml

rem Create wef directory
if not exist "%WEF_DIR%" (
    echo Creating add-in directory...
    mkdir "%WEF_DIR%"
)

rem Download manifest
echo Downloading GameData Studio manifest...
powershell -Command "Invoke-WebRequest -Uri '%MANIFEST_URL%' -OutFile '%MANIFEST_FILE%'"

if not exist "%MANIFEST_FILE%" (
    echo Download failed. Please check your network.
    pause
    exit /b 1
)

echo.
echo Install complete!
echo.
echo How to use:
echo   1. Close and reopen Excel
echo   2. Open any workbook
echo   3. Find GameData Studio button in Home tab
echo   4. Click to open sidebar
echo.
echo To uninstall:
echo   Delete file: %MANIFEST_FILE%
echo =========================================
pause
