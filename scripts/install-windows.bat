@echo off
chcp 65001 >nul
rem GameData Studio - Windows Install Script

echo =========================================
echo   GameData Studio Install
echo =========================================
echo.

set MANIFEST_URL=https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/manifest-online.xml
set ADDIN_DIR=%USERPROFILE%\GameDataStudio
set MANIFEST_FILE=%ADDIN_DIR%\manifest.xml

rem Create add-in directory
if not exist "%ADDIN_DIR%" (
    echo Creating add-in directory...
    mkdir "%ADDIN_DIR%"
)

rem Download manifest
echo Downloading manifest...
powershell -Command "Invoke-WebRequest -Uri '%MANIFEST_URL%' -OutFile '%MANIFEST_FILE%'"

if not exist "%MANIFEST_FILE%" (
    echo Download failed. Please check your network.
    pause
    exit /b 1
)

rem Register trusted catalog in registry
echo Registering trusted catalog...
set REG_PATH=HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\GameDataStudio
reg add "%REG_PATH%" /v Url /t REG_SZ /d "%ADDIN_DIR%" /f >nul 2>&1
reg add "%REG_PATH%" /v Flags /t REG_DWORD /d 1 /f >nul 2>&1

echo.
echo =========================================
echo   Install complete!
echo =========================================
echo.
echo Next steps:
echo   1. Open Excel
echo   2. File - Options - Trust Center - Trust Center Settings
echo   3. Click "Trusted Add-in Catalogs"
echo   4. Add this path: %ADDIN_DIR%
echo   5. Check "Show in Menu", click OK
echo   6. Restart Excel
echo   7. Insert - Get Add-ins - MY ADD-INS - SHARED FOLDER
echo   8. Select GameData Studio, click Add
echo.
echo Or quick method:
echo   1. Open Excel, go to Insert - Get Add-ins
echo   2. Click "MY ADD-INS" - "Upload My Add-in"
echo   3. Browse to: %MANIFEST_FILE%
echo   4. Click Upload
echo.
echo Manifest location: %MANIFEST_FILE%
echo =========================================
pause
