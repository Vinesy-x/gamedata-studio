@echo off
chcp 65001 >nul
title GameData Studio Installer

echo =========================================
echo   GameData Studio Installer
echo =========================================
echo.

:: Check admin
net session >nul 2>&1
if errorlevel 1 (
    echo This installer requires Administrator privileges.
    echo Right-click and select "Run as Administrator".
    echo.
    pause
    exit /b 1
)

set MANIFEST_URL=https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/manifest-online.xml
set SERVER_URL=https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/file-server.ps1
set STARTER_URL=https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/start-file-server.bat
set ADDIN_DIR=%APPDATA%\GameDataStudio
set DATA_DIR=%USERPROFILE%\.gamedata-studio
set MANIFEST_FILE=%ADDIN_DIR%\manifest.xml
set ADDIN_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
set CATALOG_DIR=C:\GameDataStudioCatalog
set CATALOG_SHARE=GameDataStudioCatalog

:: Step 1: Create directories
if not exist "%ADDIN_DIR%" mkdir "%ADDIN_DIR%"
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%CATALOG_DIR%" mkdir "%CATALOG_DIR%"
echo [1/5] Directories OK

:: Step 2: Download manifest
echo [2/5] Downloading manifest...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%MANIFEST_URL%' -OutFile '%MANIFEST_FILE%' -UseBasicParsing"
if not exist "%MANIFEST_FILE%" (
    echo ERROR: Download failed. Check your network.
    pause
    exit /b 1
)
copy /Y "%MANIFEST_FILE%" "%CATALOG_DIR%\manifest.xml" >nul
echo       OK

:: Step 3: Download file server
echo [3/5] Downloading file server...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%SERVER_URL%' -OutFile '%DATA_DIR%\file-server.ps1' -UseBasicParsing"
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%STARTER_URL%' -OutFile '%DATA_DIR%\start-file-server.bat' -UseBasicParsing"
echo       OK

:: Step 4: Create network share for catalog
echo [4/5] Creating catalog share...
net share %CATALOG_SHARE% /delete /yes >nul 2>&1
net share %CATALOG_SHARE%=%CATALOG_DIR% /grant:everyone,read >nul 2>&1
if errorlevel 1 (
    echo       WARN: Could not create share. Add-in may need manual catalog setup.
) else (
    echo       OK
)

:: Step 5: Register add-in
echo [5/5] Registering add-in...
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\Developer\%ADDIN_ID%" /ve /t REG_SZ /d "%MANIFEST_FILE%" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Office\15.0\WEF\Developer\%ADDIN_ID%" /ve /t REG_SZ /d "%MANIFEST_FILE%" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\%CATALOG_SHARE%" /v "Id" /t REG_SZ /d "%CATALOG_SHARE%" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\%CATALOG_SHARE%" /v "Url" /t REG_SZ /d "\\localhost\%CATALOG_SHARE%" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\%CATALOG_SHARE%" /v "Flags" /t REG_DWORD /d 1 /f >nul 2>&1
echo       OK

echo.
echo =========================================
echo   Install complete!
echo =========================================
echo.
echo Next steps:
echo   1. Start file server: %DATA_DIR%\start-file-server.bat
echo   2. Open Excel
echo   3. Insert ^> Get Add-ins ^> SHARED FOLDER ^> GameData Studio
echo.
echo If no SHARED FOLDER tab:
echo   File ^> Options ^> Trust Center ^> Trust Center Settings
echo   ^> Trusted Add-in Catalogs ^> Add: \\localhost\%CATALOG_SHARE%
echo   ^> Check "Show in Menu" ^> OK ^> Restart Excel
echo =========================================
echo.
pause
