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

# Method 2: TrustedCatalogs
Write-Host ""
Write-Host "[Step 4] Method 2: Trusted Catalog registry..." -ForegroundColor Yellow
$catalogPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\GameDataStudio"
New-Item -Path $catalogPath -Force | Out-Null
Set-ItemProperty -Path $catalogPath -Name "Id" -Value "GameDataStudio"
Set-ItemProperty -Path $catalogPath -Name "Url" -Value $installDir
Set-ItemProperty -Path $catalogPath -Name "Flags" -Value 1 -Type DWord
Write-Host "  Trusted catalog registered: $installDir" -ForegroundColor Green

# Method 3: Create a network share pointing to the install directory
Write-Host ""
Write-Host "[Step 5] Method 3: Creating network share..." -ForegroundColor Yellow
try {
    # Remove existing share if any
    net share GameDataStudio /delete 2>$null | Out-Null
    # Create new share
    $result = net share GameDataStudio="$installDir" /grant:Everyone,READ 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Share created: \\$env:COMPUTERNAME\GameDataStudio" -ForegroundColor Green

        # Also register the UNC path as a trusted catalog
        $uncCatalogPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\GameDataStudioUNC"
        New-Item -Path $uncCatalogPath -Force | Out-Null
        Set-ItemProperty -Path $uncCatalogPath -Name "Id" -Value "GameDataStudioUNC"
        Set-ItemProperty -Path $uncCatalogPath -Name "Url" -Value "\\$env:COMPUTERNAME\GameDataStudio"
        Set-ItemProperty -Path $uncCatalogPath -Name "Flags" -Value 1 -Type DWord
        Write-Host "  UNC catalog registered: \\$env:COMPUTERNAME\GameDataStudio" -ForegroundColor Green
    } else {
        Write-Host "  Share creation failed (may need admin): $result" -ForegroundColor Yellow
        Write-Host "  Skipping network share method." -ForegroundColor Gray
    }
} catch {
    Write-Host "  Share creation failed: $_" -ForegroundColor Yellow
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
echo   1. In Excel, go to: File ^> Options ^> Trust Center ^> Trust Center Settings
echo   2. Click "Trusted Add-in Catalogs"
echo   3. Add catalog URL: $installDir
echo   4. Check "Show in Menu"
echo   5. Click OK, restart Excel
echo   6. Go to: Insert ^> My Add-ins ^> SHARED FOLDER
echo   7. Click on GameData Studio
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
Write-Host "     a. Excel > File > Options > Trust Center" -ForegroundColor Gray
Write-Host "     b. Trust Center Settings > Trusted Add-in Catalogs" -ForegroundColor Gray
Write-Host "     c. Add: $installDir" -ForegroundColor Cyan
Write-Host "     d. Check 'Show in Menu', click OK" -ForegroundColor Gray
Write-Host "     e. Restart Excel, then Insert > My Add-ins > Shared Folder" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
