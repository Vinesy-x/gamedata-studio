@echo off
chcp 65001 >nul
title GameData Studio - Prepare Installer

echo =========================================
echo   Prepare Installer Files
echo =========================================
echo.

:: Step 1: Copy manifest-online.xml (HTTPS GitHub Pages - required by modern Office)
echo [1/3] Copying manifest...
copy /Y "..\manifest-online.xml" "files\manifest.xml" >nul
if errorlevel 1 (
    echo ERROR: manifest-online.xml not found
    pause
    exit /b 1
)
echo       OK

:: Step 2: Build production dist
echo [2/3] Building production bundle...
cd ..
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
cd installer
echo       OK

:: Step 3: Verify dist files exist
echo [3/3] Verifying dist files...
if not exist "..\dist\taskpane.html" (
    echo ERROR: dist/taskpane.html not found. Build may have failed.
    pause
    exit /b 1
)
echo       OK

echo.
echo =========================================
echo   Ready! Now run Inno Setup to compile:
echo   iscc setup.iss
echo =========================================
pause
