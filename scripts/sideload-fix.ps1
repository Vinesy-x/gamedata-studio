# GameData Studio - Sideloading Fix Script
# Tries multiple methods to register the add-in in Excel
# Usage: Right-click → Run as Administrator

$addinId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
$port = 9876
$installDir = "$env:APPDATA\GameDataStudio"
$manifestPath = "$installDir\manifest.xml"
$catalogDir = "C:\GameDataStudioCatalog"
$catalogShare = "GameDataStudioCatalog"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GameData Studio - Sideload Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[WARN] Not running as Administrator. Network share creation may fail." -ForegroundColor Yellow
    Write-Host "  Right-click this script and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
}

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

# Method 1: Network share catalog (most reliable for modern Office)
Write-Host ""
Write-Host "[Step 2] Method 1: Network share catalog..." -ForegroundColor Yellow
if (-not (Test-Path $catalogDir)) {
    New-Item -ItemType Directory -Path $catalogDir -Force | Out-Null
}
Copy-Item -Path $manifestPath -Destination "$catalogDir\manifest.xml" -Force
Write-Host "  Manifest copied to $catalogDir" -ForegroundColor Green

# Create/update network share
try {
    net share $catalogShare /delete /yes 2>$null
    net share "$catalogShare=$catalogDir" /grant:everyone,read 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Network share created: \\localhost\$catalogShare" -ForegroundColor Green
    } else {
        Write-Host "  WARN: net share failed (need admin). Try running as Administrator." -ForegroundColor Yellow
    }
} catch {
    Write-Host "  WARN: Could not create share: $_" -ForegroundColor Yellow
}

# Register trusted catalog with UNC path
$catalogRegPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\$catalogShare"
New-Item -Path $catalogRegPath -Force | Out-Null
Set-ItemProperty -Path $catalogRegPath -Name "Id" -Value $catalogShare
Set-ItemProperty -Path $catalogRegPath -Name "Url" -Value "\\localhost\$catalogShare"
Set-ItemProperty -Path $catalogRegPath -Name "Flags" -Value 1 -Type DWord
Write-Host "  Trusted catalog registered: \\localhost\$catalogShare" -ForegroundColor Green

# Method 2: WEF\Developer (fallback for older Office)
Write-Host ""
Write-Host "[Step 3] Method 2: WEF\Developer registry..." -ForegroundColor Yellow
foreach ($ver in @("16.0", "15.0")) {
    $regPath = "HKCU:\Software\Microsoft\Office\$ver\WEF\Developer\$addinId"
    New-Item -Path $regPath -Force | Out-Null
    Set-ItemProperty -Path $regPath -Name "(default)" -Value $manifestPath
    Write-Host "  Set: Office $ver -> $manifestPath" -ForegroundColor Green
}

# Fix HasRegistryAddin flags
Write-Host ""
Write-Host "[Step 4] Fixing HasRegistryAddin flags..." -ForegroundColor Yellow
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

# Verify file server
Write-Host ""
Write-Host "[Step 5] Verify file server..." -ForegroundColor Yellow
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:$port/manifest.xml" -UseBasicParsing -TimeoutSec 5
    Write-Host "  OK: file server running ($($resp.Content.Length) bytes)" -ForegroundColor Green
} catch {
    Write-Host "  WARN: File server not running (needed for file export only)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Done!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now:" -ForegroundColor Yellow
Write-Host "  1. Open Excel" -ForegroundColor White
Write-Host "  2. Insert > Get Add-ins > SHARED FOLDER" -ForegroundColor White
Write-Host "  3. Click GameData Studio to add it" -ForegroundColor White
Write-Host ""
Write-Host "If no SHARED FOLDER tab:" -ForegroundColor Yellow
Write-Host "  File > Options > Trust Center > Trust Center Settings" -ForegroundColor Gray
Write-Host "  > Trusted Add-in Catalogs > Add: \\localhost\$catalogShare" -ForegroundColor Cyan
Write-Host "  > Check 'Show in Menu' > OK > Restart Excel" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
