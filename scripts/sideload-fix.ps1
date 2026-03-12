# GameData Studio - Sideloading Fix Script
# Tries multiple methods to register the add-in in Excel
# Usage: Right-click → Run with PowerShell

$addinId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
$port = 9876
$installDir = "$env:APPDATA\GameDataStudio"
$manifestPath = "$installDir\manifest.xml"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GameData Studio - Sideload Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Pre-check
if (-not (Test-Path $manifestPath)) {
    Write-Host "[ERROR] manifest.xml not found at $manifestPath" -ForegroundColor Red
    Write-Host "Please run the installer first." -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Kill Excel first
Write-Host "[Step 0] Closing Excel..." -ForegroundColor Yellow
$excelProcs = Get-Process excel -ErrorAction SilentlyContinue
if ($excelProcs) {
    $excelProcs | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "  Excel closed." -ForegroundColor Green
} else {
    Write-Host "  Excel not running." -ForegroundColor Gray
}

# Clear WEF cache
Write-Host ""
Write-Host "[Step 1] Clearing WEF cache..." -ForegroundColor Yellow
$wefCache = "$env:LOCALAPPDATA\Microsoft\Office\16.0\Wef"
if (Test-Path $wefCache) {
    Remove-Item "$wefCache\*" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Cache cleared: $wefCache" -ForegroundColor Green
} else {
    Write-Host "  No cache found." -ForegroundColor Gray
}

# Method 1: WEF\Developer (standard sideloading)
Write-Host ""
Write-Host "[Step 2] Method 1: WEF\Developer registry..." -ForegroundColor Yellow
foreach ($ver in @("16.0", "15.0")) {
    $regPath = "HKCU:\Software\Microsoft\Office\$ver\WEF\Developer\$addinId"
    New-Item -Path $regPath -Force | Out-Null
    Set-ItemProperty -Path $regPath -Name "(default)" -Value $manifestPath
    Write-Host "  Set: Office $ver -> $manifestPath" -ForegroundColor Green
}

# Fix HasRegistryAddin flags
Write-Host ""
Write-Host "[Step 3] Fixing HasRegistryAddin flags..." -ForegroundColor Yellow
$wefBase = "HKCU:\Software\Microsoft\Office\16.0\WEF"
if (Test-Path $wefBase) {
    $wefProps = Get-ItemProperty $wefBase -ErrorAction SilentlyContinue
    $hasRegProps = ($wefProps | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -like "*HasRegistry*" }).Name
    foreach ($prop in $hasRegProps) {
        Set-ItemProperty -Path $wefBase -Name $prop -Value 1 -Type DWord
        Write-Host "  Set $prop = 1" -ForegroundColor Green
    }
    if (-not $hasRegProps) {
        Write-Host "  No HasRegistryAddin flags found." -ForegroundColor Gray
    }
}

# Method 2: TrustedCatalogs (use HTTP URL, not file path — Trust Center requires URL)
Write-Host ""
Write-Host "[Step 4] Method 2: Trusted Catalog registry..." -ForegroundColor Yellow
$catalogUrl = "http://localhost:$port"
$catalogPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\GameDataStudio"
New-Item -Path $catalogPath -Force | Out-Null
Set-ItemProperty -Path $catalogPath -Name "Id" -Value "GameDataStudio"
Set-ItemProperty -Path $catalogPath -Name "Url" -Value $catalogUrl
Set-ItemProperty -Path $catalogPath -Name "Flags" -Value 1 -Type DWord
Write-Host "  Trusted catalog registered: $catalogUrl" -ForegroundColor Green

# Method 3: Verify file server can serve manifest.xml
Write-Host ""
Write-Host "[Step 5] Method 3: Verify file server serves manifest..." -ForegroundColor Yellow
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:$port/manifest.xml" -UseBasicParsing -TimeoutSec 5
    if ($resp.StatusCode -eq 200 -and $resp.Content.Length -gt 100) {
        Write-Host "  OK: http://localhost:$port/manifest.xml ($($resp.Content.Length) bytes)" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: manifest.xml response unexpected (status=$($resp.StatusCode), size=$($resp.Content.Length))" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  FAIL: File server not serving manifest.xml" -ForegroundColor Red
    Write-Host "  Make sure file server is running first!" -ForegroundColor Yellow
    Write-Host "  Run: powershell -ExecutionPolicy Bypass -File `"$installDir\file-server.ps1`"" -ForegroundColor Cyan
}

# Method 4: Create a simple batch file for manual sideload via office-addin-dev-settings
Write-Host ""
Write-Host "[Step 6] Creating manual sideload helper..." -ForegroundColor Yellow
$helperScript = @"
@echo off
echo Opening Excel with sideloaded add-in...
echo.

REM Method A: Open Excel and trigger manifest load
start excel

echo Waiting for Excel to start...
timeout /t 5 /nobreak > nul

echo.
echo If the add-in doesn't appear:
echo   1. Make sure file server is running (GameData Studio Server in system tray)
echo   2. In Excel: File ^> Options ^> Trust Center ^> Trust Center Settings
echo   3. Click "Trusted Add-in Catalogs"
echo   4. Add catalog URL: http://localhost:9876
echo   5. Check "Show in Menu", click OK
echo   6. Restart Excel
echo   7. Go to: Insert ^> Get Add-ins (or My Add-ins) ^> SHARED FOLDER
echo   8. Click on GameData Studio
echo.
pause
"@
$helperPath = Join-Path $installDir "open-with-addin.bat"
Set-Content -Path $helperPath -Value $helperScript -Encoding ASCII
Write-Host "  Helper saved: $helperPath" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " All methods applied!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now try these steps IN ORDER:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Open Excel" -ForegroundColor White
Write-Host "     -> Check if GameData Studio appears on Home tab" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. If NOT on Home tab, try Shared Folder catalog:" -ForegroundColor White
Write-Host "     a. Excel > Insert > Get Add-ins (or My Add-ins)" -ForegroundColor Gray
Write-Host "     b. Click 'SHARED FOLDER' tab at the top" -ForegroundColor Gray
Write-Host "     c. You should see GameData Studio - click to add it" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. If no 'SHARED FOLDER', manually add catalog:" -ForegroundColor White
Write-Host "     a. Make sure file server is running!" -ForegroundColor Yellow
Write-Host "     b. Excel > File > Options > Trust Center" -ForegroundColor Gray
Write-Host "     c. Trust Center Settings > Trusted Add-in Catalogs" -ForegroundColor Gray
Write-Host "     d. Add URL: http://localhost:9876" -ForegroundColor Cyan
Write-Host "     e. Check 'Show in Menu', click OK" -ForegroundColor Gray
Write-Host "     f. Restart Excel, then Insert > Get Add-ins > Shared Folder" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
