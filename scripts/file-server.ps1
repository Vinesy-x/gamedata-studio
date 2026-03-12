# GameData Studio - Local File Server (Windows)
# Usage: Double-click start-file-server.bat

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

# Check and update
Write-Log "GameData Studio File Server starting..."
Write-Log "Data dir: $dataDir"
Write-Log "Web dir: $webDir"
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
