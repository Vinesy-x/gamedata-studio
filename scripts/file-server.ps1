# GameData Studio - Local File Server (Windows)
# Usage: Double-click start-file-server.bat
param([switch]$Restarted)

$ServerVersion = "1.8.9"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Log to file for debugging (hidden window has no console output)
$logFile = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "server.log"
function Write-Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
}

$port = 9876
# Auto-detect: if web/ exists next to this script, use script directory; otherwise use ~/.gamedata-studio
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path "$scriptDir\web") {
    $dataDir = $scriptDir
} else {
    $dataDir = "$env:USERPROFILE\.gamedata-studio"
}
$webDir = "$dataDir\web"
$versionFile = "$webDir\version.txt"
$githubPages = "https://vinesy-x.github.io/gamedata-studio"

$distFiles = @(
    "taskpane.html",
    "taskpane.bundle.js",
    "taskpane.bundle.js.LICENSE.txt",
    "assets/gds-16.png",
    "assets/gds-32.png",
    "assets/gds-80.png"
)

function Update-WebFiles {
    $localVersion = ""
    if (Test-Path $versionFile) {
        $localVersion = (Get-Content $versionFile -Raw).Trim()
    }

    Write-Host "Checking for updates..."
    try {
        $remoteVersion = (Invoke-WebRequest -Uri "$githubPages/version.txt" -UseBasicParsing -TimeoutSec 10).Content.Trim()
    } catch {
        if ($localVersion) {
            Write-Host "  Offline mode, using cached v$localVersion"
            return $true
        }
        Write-Host "  ERROR: No cached files and cannot reach GitHub."
        return $false
    }

    if ($remoteVersion -eq $localVersion) {
        Write-Host "  Already up to date (v$localVersion)"
        return $true
    }

    Write-Host "  Updating: v$localVersion -> v$remoteVersion"
    New-Item -ItemType Directory -Path "$webDir\assets" -Force | Out-Null

    $ok = $true
    foreach ($file in $distFiles) {
        $url = "$githubPages/$file"
        $localPath = Join-Path $webDir ($file -replace '/', '\')
        $dir = Split-Path $localPath -Parent
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        try {
            Invoke-WebRequest -Uri $url -OutFile $localPath -UseBasicParsing -TimeoutSec 15
            $size = (Get-Item $localPath).Length
            Write-Host "  Downloaded $file ($size bytes)"
        } catch {
            Write-Host "  Warning: failed to download $file"
            $ok = $false
        }
    }

    if ($ok) {
        Set-Content -Path $versionFile -Value $remoteVersion -NoNewline
        Write-Host "  Updated to v$remoteVersion"
    }
    return $true
}

# Self-update: download latest file-server.ps1 from GitHub, auto-restart if updated
function Update-Self {
    $selfPath = $PSCommandPath
    if (-not $selfPath) { return $false }
    $url = "https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/file-server.ps1"
    try {
        $newContent = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10).Content
        $currentContent = Get-Content -Path $selfPath -Raw -ErrorAction SilentlyContinue
        if ($newContent -and $newContent -ne $currentContent) {
            Set-Content -Path $selfPath -Value $newContent -NoNewline -Encoding UTF8
            Write-Log "file-server.ps1 updated, restarting..."
            return $true
        }
    } catch {
        Write-Log "Warning: self-update failed: $($_.Exception.Message)"
    }
    return $false
}

# Check and update
Write-Log "GameData Studio File Server starting..."
Write-Log "Data dir: $dataDir"
Write-Log "Web dir: $webDir"
if (-not $Restarted -and (Update-Self)) {
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -Restarted" -WindowStyle Normal
    exit
}
if (-not (Update-WebFiles)) {
    Write-Log "ERROR: Update-WebFiles failed, exiting"
    exit 1
}

# Chunked upload storage
$script:chunks = @{}

# Start HTTP listener
Add-Type -AssemblyName System.Web
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")
try {
    $listener.Start()
} catch {
    Write-Log "ERROR: Failed to start listener on port $port - $($_.Exception.Message)"
    Write-Log "Another process may be using port $port, or firewall is blocking it."
    exit 1
}

Write-Log "Ready! http://localhost:$port"
Write-Log "Keep this window open while using Excel."

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "application/javascript"
    ".css"  = "text/css"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
    ".json" = "application/json"
    ".txt"  = "text/plain"
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response

    $res.Headers.Add("Access-Control-Allow-Origin", "*")
    $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

    if ($req.HttpMethod -eq "OPTIONS") {
        $res.StatusCode = 200
        $res.Close()
        continue
    }

    $urlPath = $req.Url.AbsolutePath

    # API: version
    if ($req.HttpMethod -eq "GET" -and $urlPath -eq "/api/version") {
        $res.ContentType = "application/json"
        $msg = [System.Text.Encoding]::UTF8.GetBytes("{`"version`":`"$ServerVersion`"}")
        $res.OutputStream.Write($msg, 0, $msg.Length)
        $res.Close()
        continue
    }

    # API: read file
    if ($req.HttpMethod -eq "GET" -and $urlPath -eq "/api/read-file") {
        $params = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)
        $dir = $params["directory"]
        $fileName = $params["fileName"]
        $filePath = Join-Path $dir $fileName

        if (Test-Path $filePath) {
            $data = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentType = "application/octet-stream"
            $res.OutputStream.Write($data, 0, $data.Length)
        } else {
            $res.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes('{"error":"not found"}')
            $res.OutputStream.Write($msg, 0, $msg.Length)
        }
        $res.Close()
        continue
    }

    # API: write file (POST - kept for dev mode compatibility)
    if ($req.HttpMethod -eq "POST" -and $urlPath -eq "/api/write-file") {
        $reader = New-Object System.IO.StreamReader($req.InputStream)
        $body = $reader.ReadToEnd() | ConvertFrom-Json

        $dir = $body.directory
        $fileName = $body.fileName
        $data = [Convert]::FromBase64String($body.data)

        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }

        $filePath = Join-Path $dir $fileName
        [System.IO.File]::WriteAllBytes($filePath, $data)
        Write-Host "  -> $filePath ($($data.Length) bytes)"

        $res.ContentType = "application/json"
        $msg = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
        $res.OutputStream.Write($msg, 0, $msg.Length)
        $res.Close()
        continue
    }

    # API: restart (self-update and restart)
    if ($req.HttpMethod -eq "GET" -and $urlPath -eq "/api/restart") {
        $res.ContentType = "application/json"
        $msg = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true,"message":"restarting..."}')
        $res.OutputStream.Write($msg, 0, $msg.Length)
        $res.Close()
        Write-Log "[restart] Restart requested via API"
        $listener.Stop()
        # Update self then restart
        $selfPath = $PSCommandPath
        if ($selfPath) {
            $url = "https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main/scripts/file-server.ps1"
            try {
                $newContent = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10).Content
                if ($newContent) {
                    Set-Content -Path $selfPath -Value $newContent -NoNewline -Encoding UTF8
                    Write-Log "[restart] Updated file-server.ps1"
                }
            } catch {
                Write-Log "[restart] Self-update failed: $($_.Exception.Message)"
            }
        }
        Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$selfPath`" -Restarted" -WindowStyle Normal
        exit
    }

    # API: git push (execute whitelisted git commands)
    if ($req.HttpMethod -eq "GET" -and $urlPath -eq "/api/git-push") {
        $params = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)
        $dir = $params["directory"]
        $scriptB64 = $params["script"]
        $res.ContentType = "application/json"

        if (-not $dir -or -not $scriptB64) {
            $res.StatusCode = 400
            $msg = [System.Text.Encoding]::UTF8.GetBytes('{"error":"missing params (directory, script)"}')
            $res.OutputStream.Write($msg, 0, $msg.Length)
            $res.Close()
            continue
        }

        try {
            $scriptText = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($scriptB64))
        } catch {
            $res.StatusCode = 400
            $errMsg = $_.Exception.Message -replace '"', '\"'
            $msg = [System.Text.Encoding]::UTF8.GetBytes("{`"error`":`"base64 decode failed: $errMsg`"}")
            $res.OutputStream.Write($msg, 0, $msg.Length)
            $res.Close()
            continue
        }

        # Security: each line must start with cd, git, or be empty
        $forbidden = $false
        foreach ($line in $scriptText -split "`n") {
            $trimmed = $line.Trim()
            if (-not $trimmed) { continue }
            if (-not ($trimmed.StartsWith("cd ") -or $trimmed.StartsWith("git "))) {
                $res.StatusCode = 403
                $msg = [System.Text.Encoding]::UTF8.GetBytes("{`"error`":`"forbidden command: $trimmed`"}")
                $res.OutputStream.Write($msg, 0, $msg.Length)
                $forbidden = $true
                break
            }
        }
        if ($forbidden) { $res.Close(); continue }

        Write-Log "[git-push] dir=$dir"
        try {
            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = "cmd.exe"
            $psi.Arguments = "/c chcp 65001 >nul && $scriptText"
            $psi.WorkingDirectory = $dir
            $psi.RedirectStandardOutput = $true
            $psi.RedirectStandardError = $true
            $psi.UseShellExecute = $false
            $psi.CreateNoWindow = $true
            $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
            $psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8
            $proc = [System.Diagnostics.Process]::Start($psi)
            $stdout = $proc.StandardOutput.ReadToEnd()
            $stderr = $proc.StandardError.ReadToEnd()
            $proc.WaitForExit(60000)
            $exitCode = $proc.ExitCode
            Write-Log "[git-push] exitCode=$exitCode"

            # 手动构建 JSON（避免 ConvertTo-Json 转义中文为 \uXXXX）
            $outText = if ($stdout) { $stdout.Trim() } else { "" }
            $errText = if ($exitCode -ne 0 -and $stderr) { $stderr.Trim() } else { "" }
            $okStr = if ($exitCode -eq 0) { "true" } else { "false" }
            # 转义 JSON 特殊字符
            $outJson = $outText -replace '\\', '\\\\' -replace '"', '\"' -replace "`r`n", '\n' -replace "`n", '\n' -replace "`r", '\n' -replace "`t", '\t'
            $errJson = $errText -replace '\\', '\\\\' -replace '"', '\"' -replace "`r`n", '\n' -replace "`n", '\n' -replace "`r", '\n' -replace "`t", '\t'
            $body = "{`"ok`":$okStr,`"output`":`"$outJson`",`"exitCode`":$exitCode"
            if ($errText) { $body += ",`"error`":`"$errJson`"" }
            $body += "}"
            $msg = [System.Text.Encoding]::UTF8.GetBytes($body)
            $res.OutputStream.Write($msg, 0, $msg.Length)
        } catch {
            $errMsg = $_.Exception.Message
            $res.StatusCode = 500
            $errBody = @{ error = $errMsg } | ConvertTo-Json -Compress
            $msg = [System.Text.Encoding]::UTF8.GetBytes($errBody)
            $res.OutputStream.Write($msg, 0, $msg.Length)
        }
        $res.Close()
        continue
    }

    # API: GET-based chunked write (bypass Office proxy POST block)
    if ($req.HttpMethod -eq "GET" -and $urlPath -eq "/api/write-start") {
        $params = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)
        $dir = $params["directory"]
        $fileName = $params["fileName"]
        $id = [Guid]::NewGuid().ToString()
        $script:chunks[$id] = @{ directory = $dir; fileName = $fileName; parts = @{} }
        $res.ContentType = "application/json"
        $msg = [System.Text.Encoding]::UTF8.GetBytes("{`"id`":`"$id`"}")
        $res.OutputStream.Write($msg, 0, $msg.Length)
        $res.Close()
        continue
    }

    if ($req.HttpMethod -eq "GET" -and $urlPath -eq "/api/write-chunk") {
        $params = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)
        $id = $params["id"]
        $index = [int]$params["index"]
        $chunkData = $params["data"]
        if ($script:chunks.ContainsKey($id)) {
            $script:chunks[$id].parts[$index] = $chunkData
            $res.ContentType = "application/json"
            $msg = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
            $res.OutputStream.Write($msg, 0, $msg.Length)
        } else {
            $res.StatusCode = 400
            $msg = [System.Text.Encoding]::UTF8.GetBytes('{"error":"invalid id"}')
            $res.OutputStream.Write($msg, 0, $msg.Length)
        }
        $res.Close()
        continue
    }

    if ($req.HttpMethod -eq "GET" -and $urlPath -eq "/api/write-finish") {
        $params = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)
        $id = $params["id"]
        if ($script:chunks.ContainsKey($id)) {
            $info = $script:chunks[$id]
            $script:chunks.Remove($id)
            $sorted = $info.parts.GetEnumerator() | Sort-Object Key
            $fullB64 = ($sorted | ForEach-Object { $_.Value }) -join ""
            $dir = $info.directory
            $fileName = $info.fileName
            try {
                if (-not (Test-Path $dir)) {
                    New-Item -ItemType Directory -Path $dir -Force | Out-Null
                }
                $filePath = Join-Path $dir $fileName
                $data = [Convert]::FromBase64String($fullB64)
                [System.IO.File]::WriteAllBytes($filePath, $data)
                Write-Host "  -> $filePath ($($data.Length) bytes)"
                $res.ContentType = "application/json"
                $msg = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
                $res.OutputStream.Write($msg, 0, $msg.Length)
            } catch {
                $res.StatusCode = 500
                $errMsg = $_.Exception.Message -replace '"', '\"'
                $msg = [System.Text.Encoding]::UTF8.GetBytes("{`"error`":`"$errMsg`"}")
                $res.OutputStream.Write($msg, 0, $msg.Length)
            }
        } else {
            $res.StatusCode = 400
            $msg = [System.Text.Encoding]::UTF8.GetBytes('{"error":"invalid id"}')
            $res.OutputStream.Write($msg, 0, $msg.Length)
        }
        $res.Close()
        continue
    }

    # Static files
    if ($req.HttpMethod -eq "GET") {
        $servePath = $urlPath
        if ($servePath -eq "/") { $servePath = "/taskpane.html" }

        # Serve manifest.xml from install root (for Trusted Catalog)
        if ($servePath -eq "/manifest.xml") {
            $localPath = Join-Path $dataDir "manifest.xml"
        } else {
            $localPath = Join-Path $webDir ($servePath.TrimStart('/') -replace '/', '\')
        }

        if (Test-Path $localPath) {
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $ct = $mimeTypes[$ext]
            if (-not $ct) { $ct = "application/octet-stream" }
            $res.ContentType = $ct
            $fileData = [System.IO.File]::ReadAllBytes($localPath)
            $res.OutputStream.Write($fileData, 0, $fileData.Length)
            $res.Close()
            continue
        }
    }

    $res.StatusCode = 404
    $res.Close()
}
