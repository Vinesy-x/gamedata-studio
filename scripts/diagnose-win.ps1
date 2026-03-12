# GameData Studio - Windows Diagnostics
# Usage: Right-click → Run with PowerShell, or: powershell -File diagnose-win.ps1

$addinId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
$port = 9876
$installDir = "$env:APPDATA\GameDataStudio"
$pass = 0
$fail = 0
$warn = 0

function Write-Check($label) { Write-Host "`n[$label]" -ForegroundColor Cyan }
function Write-Pass($msg) { $script:pass++; Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Write-Fail($msg) { $script:fail++; Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-Warn($msg) { $script:warn++; Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Info($msg) { Write-Host "  [INFO] $msg" -ForegroundColor Gray }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GameData Studio - Windows Diagnostics" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Installation directory ──────────────────────────────────

Write-Check "1. Installation Directory"
if (Test-Path $installDir) {
    Write-Pass "Install dir exists: $installDir"
    $files = @("manifest.xml", "file-server.ps1", "start-hidden.vbs")
    foreach ($f in $files) {
        $fp = Join-Path $installDir $f
        if (Test-Path $fp) {
            $size = (Get-Item $fp).Length
            Write-Pass "$f exists ($size bytes)"
        } else {
            Write-Fail "$f NOT FOUND"
        }
    }
    # Check web dir
    $webDir = Join-Path $installDir "web"
    if (Test-Path $webDir) {
        $webFiles = Get-ChildItem $webDir -Recurse -File
        Write-Pass "web/ directory exists ($($webFiles.Count) files)"
    } else {
        Write-Warn "web/ directory not found (will be downloaded on first server start)"
    }
} else {
    Write-Fail "Install dir NOT FOUND: $installDir"
    Write-Info "Expected after running the installer"
}

# ── 2. Manifest content ───────────────────────────────────────

Write-Check "2. Manifest XML"
$manifestPath = Join-Path $installDir "manifest.xml"
if (Test-Path $manifestPath) {
    $content = Get-Content $manifestPath -Raw -Encoding UTF8
    Write-Info "File size: $((Get-Item $manifestPath).Length) bytes"

    # Check encoding: BOM?
    $bytes = [System.IO.File]::ReadAllBytes($manifestPath)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        Write-Info "Encoding: UTF-8 with BOM"
    } else {
        Write-Info "Encoding: UTF-8 (no BOM)"
    }

    # Check http vs https
    if ($content -match "https://localhost:$port") {
        Write-Fail "Manifest still uses HTTPS! Should be HTTP for Windows"
        Write-Info "Found: https://localhost:$port"
    } elseif ($content -match "http://localhost:$port") {
        Write-Pass "URLs correctly use HTTP (http://localhost:$port)"
    } else {
        Write-Fail "No localhost:$port URL found in manifest"
    }

    # Validate XML
    try {
        $xml = [xml]$content
        $id = $xml.OfficeApp.Id
        Write-Pass "Valid XML, Add-in ID: $id"
        if ($id -ne $addinId) {
            Write-Warn "ID mismatch! Expected: $addinId"
        }
    } catch {
        Write-Fail "XML parse error: $_"
    }

    # Check SourceLocation
    $sourceMatch = [regex]::Match($content, 'SourceLocation[^"]*DefaultValue="([^"]*)"')
    if ($sourceMatch.Success) {
        Write-Info "SourceLocation: $($sourceMatch.Groups[1].Value)"
    }
} else {
    Write-Fail "manifest.xml not found"
}

# ── 3. Registry (sideloading) ─────────────────────────────────

Write-Check "3. Registry Sideloading"
$regFound = $false
foreach ($ver in @("16.0", "15.0")) {
    $regPath = "HKCU:\Software\Microsoft\Office\$ver\WEF\Developer\$addinId"
    if (Test-Path $regPath) {
        $regValue = (Get-ItemProperty $regPath).'(default)'
        Write-Pass "Registry key found: Office $ver"
        Write-Info "Path: $regPath"
        Write-Info "Value: $regValue"
        if (Test-Path $regValue) {
            Write-Pass "Registry points to existing file"
        } else {
            Write-Fail "Registry points to NON-EXISTING file: $regValue"
        }
        $regFound = $true
    }
}
if (-not $regFound) {
    Write-Fail "No registry key found for add-in sideloading"
    Write-Info "Checked: HKCU:\Software\Microsoft\Office\16.0\WEF\Developer\$addinId"
    Write-Info "Checked: HKCU:\Software\Microsoft\Office\15.0\WEF\Developer\$addinId"

    # Check what Office versions exist
    Write-Info ""
    Write-Info "Scanning installed Office versions..."
    $officeVersions = Get-ChildItem "HKCU:\Software\Microsoft\Office" -ErrorAction SilentlyContinue |
        Where-Object { $_.PSChildName -match '^\d+\.\d+$' } |
        ForEach-Object { $_.PSChildName }
    if ($officeVersions) {
        Write-Info "Found Office versions: $($officeVersions -join ', ')"
        foreach ($v in $officeVersions) {
            if ($v -ne "16.0" -and $v -ne "15.0") {
                Write-Warn "You may need registry key for Office $v"
            }
        }
    } else {
        Write-Fail "No Office registry entries found at all"
    }
}

# ── 4. File server status ─────────────────────────────────────

Write-Check "4. File Server"
# Check if port is in use
$tcpTest = $null
try {
    $tcpTest = New-Object System.Net.Sockets.TcpClient
    $tcpTest.Connect("localhost", $port)
    $tcpTest.Close()
    Write-Pass "Port $port is listening"
} catch {
    Write-Fail "Port $port is NOT listening (file server not running)"
    Write-Info "Try running: powershell -File `"$installDir\file-server.ps1`""
}

# Check PowerShell process
$psProcs = Get-Process powershell -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -like "GameData*" -or $_.CommandLine -like "*file-server*" }
$pwshProcs = Get-Process pwsh -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*file-server*" }
$allProcs = @($psProcs) + @($pwshProcs) | Where-Object { $_ }
if ($allProcs.Count -gt 0) {
    Write-Pass "File server process found (PID: $($allProcs[0].Id))"
} else {
    Write-Warn "Could not find file-server PowerShell process"
}

# Try HTTP request
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:$port/taskpane.html" -UseBasicParsing -TimeoutSec 5
    Write-Pass "HTTP GET /taskpane.html -> $($resp.StatusCode) ($($resp.Content.Length) bytes)"
} catch {
    Write-Fail "HTTP GET /taskpane.html FAILED: $($_.Exception.Message)"
}

# ── 5. Excel version info ─────────────────────────────────────

Write-Check "5. Excel Info"
$excelPath = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\excel.exe" -ErrorAction SilentlyContinue).'(default)'
if ($excelPath -and (Test-Path $excelPath)) {
    $excelVer = (Get-Item $excelPath).VersionInfo.ProductVersion
    Write-Pass "Excel found: $excelPath"
    Write-Info "Version: $excelVer"
} else {
    # Try alternate location
    $excelProc = Get-Process excel -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($excelProc) {
        Write-Pass "Excel is running (PID: $($excelProc.Id))"
        Write-Info "Path: $($excelProc.Path)"
    } else {
        Write-Warn "Excel not found or not running"
    }
}

# Check WebView2 runtime
$wv2Path = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
$wv2 = Get-ItemProperty $wv2Path -ErrorAction SilentlyContinue
if ($wv2) {
    Write-Pass "WebView2 Runtime: $($wv2.pv)"
} else {
    $wv2Path2 = "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
    $wv2 = Get-ItemProperty $wv2Path2 -ErrorAction SilentlyContinue
    if ($wv2) {
        Write-Pass "WebView2 Runtime: $($wv2.pv)"
    } else {
        Write-Warn "WebView2 Runtime not detected (older Office may use IE)"
    }
}

# ── 6. Office Trust Center & Policies ─────────────────────────

Write-Check "6. Office Add-in Trust & Policies"
$trustPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs"
if (Test-Path $trustPath) {
    Write-Pass "Trusted catalogs registry exists"
    $catalogs = Get-ChildItem $trustPath -ErrorAction SilentlyContinue
    foreach ($cat in $catalogs) {
        $catProps = Get-ItemProperty $cat.PSPath -ErrorAction SilentlyContinue
        Write-Info "  Catalog: $($cat.PSChildName) -> Url=$($catProps.Url)"
    }
} else {
    Write-Warn "No trusted catalogs configured"
}

# Check if web add-ins are blocked
$secPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\Security"
if (Test-Path $secPath) {
    $props = Get-ItemProperty $secPath -ErrorAction SilentlyContinue
    Write-Info "WEF Security settings: $($props | Format-List | Out-String)"
} else {
    Write-Info "No WEF security overrides (using defaults)"
}

# Check Group Policy restrictions
Write-Check "6b. Group Policy & Restrictions"
$policyPaths = @(
    "HKCU:\Software\Policies\Microsoft\Office\16.0\WEF",
    "HKLM:\Software\Policies\Microsoft\Office\16.0\WEF",
    "HKCU:\Software\Microsoft\Office\16.0\WEF"
)
$gpBlocked = $false
foreach ($pp in $policyPaths) {
    if (Test-Path $pp) {
        $gpProps = Get-ItemProperty $pp -ErrorAction SilentlyContinue
        # Check AllowDeveloperCatalog
        if ($null -ne $gpProps.AllowDeveloperCatalog -and $gpProps.AllowDeveloperCatalog -eq 0) {
            Write-Fail "Developer catalog BLOCKED at $pp (AllowDeveloperCatalog=0)"
            $gpBlocked = $true
        }
        # Check BlockWebAddins
        if ($null -ne $gpProps.BlockWebAddins -and $gpProps.BlockWebAddins -eq 1) {
            Write-Fail "Web add-ins BLOCKED at $pp (BlockWebAddins=1)"
            $gpBlocked = $true
        }
        # Check AllowWebExtensions
        if ($null -ne $gpProps.AllowWebExtensions -and $gpProps.AllowWebExtensions -eq 0) {
            Write-Fail "Web extensions BLOCKED at $pp (AllowWebExtensions=0)"
            $gpBlocked = $true
        }
    }
}
if (-not $gpBlocked) {
    Write-Pass "No Group Policy blocks detected"
}

# Check HasRegistryAddin flag
Write-Check "6c. HasRegistryAddin Flag"
$wefBase = "HKCU:\Software\Microsoft\Office\16.0\WEF"
if (Test-Path $wefBase) {
    $wefProps = Get-ItemProperty $wefBase -ErrorAction SilentlyContinue
    $propNames = ($wefProps | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -like "*HasRegistry*" }).Name
    if ($propNames) {
        foreach ($pn in $propNames) {
            $val = $wefProps.$pn
            if ($val -eq 0) {
                Write-Fail "$pn = 0 (Excel ignores WEF\Developer key!)"
                Write-Info "Fix: reg add `"HKCU\Software\Microsoft\Office\16.0\WEF`" /v `"$pn`" /t REG_DWORD /d 1 /f"
            } else {
                Write-Pass "$pn = $val"
            }
        }
    } else {
        Write-Info "No HasRegistryAddin flags found (checking all values...)"
        $allNames = ($wefProps | Get-Member -MemberType NoteProperty).Name | Where-Object { $_ -notlike "PS*" }
        foreach ($n in $allNames) {
            Write-Info "  $n = $($wefProps.$n)"
        }
    }
}

# Check Developer key contents
Write-Check "6d. WEF Developer Key"
$devPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"
if (Test-Path $devPath) {
    $devKeys = Get-ChildItem $devPath -ErrorAction SilentlyContinue
    if ($devKeys.Count -eq 0) {
        Write-Warn "Developer key exists but is empty"
    }
    foreach ($dk in $devKeys) {
        $dkVal = (Get-ItemProperty $dk.PSPath -ErrorAction SilentlyContinue).'(default)'
        Write-Info "  $($dk.PSChildName) -> $dkVal"
        if ($dkVal -and (Test-Path $dkVal)) {
            Write-Pass "  Manifest file exists"
        } elseif ($dkVal) {
            Write-Fail "  Manifest file NOT FOUND: $dkVal"
        }
    }
} else {
    Write-Fail "WEF\Developer key does not exist"
}

# ── 7. Startup shortcut ──────────────────────────────────────

Write-Check "7. Auto-start Shortcut"
$startupLink = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\GameData Studio Server.lnk"
if (Test-Path $startupLink) {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($startupLink)
    Write-Pass "Startup shortcut exists"
    Write-Info "Target: $($shortcut.TargetPath)"
    Write-Info "Arguments: $($shortcut.Arguments)"
} else {
    Write-Warn "Startup shortcut not found"
    Write-Info "Expected: $startupLink"
}

# ── Summary ───────────────────────────────────────────────────

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Summary: $pass PASS, $fail FAIL, $warn WARN" -ForegroundColor $(if ($fail -gt 0) { "Red" } elseif ($warn -gt 0) { "Yellow" } else { "Green" })
Write-Host "========================================" -ForegroundColor Cyan

if ($fail -gt 0) {
    Write-Host ""
    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "  1. Re-run the installer if files are missing" -ForegroundColor Yellow
    Write-Host "  2. Restart Excel completely after install" -ForegroundColor Yellow
    Write-Host "  3. Check if antivirus is blocking PowerShell/port $port" -ForegroundColor Yellow
    Write-Host "  4. Try: Excel > File > Options > Trust Center > Trusted Add-in Catalogs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
