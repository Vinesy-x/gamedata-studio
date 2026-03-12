# GameData Studio - Local File Server (Windows)
# Usage: Right-click -> Run with PowerShell
# Or: powershell -ExecutionPolicy Bypass -File file-server.ps1

$port = 9876
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "GameData Studio File Server"
Write-Host "Listening on http://localhost:$port"
Write-Host "Keep this window open while using the add-in."
Write-Host ""

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response

    # CORS headers
    $res.Headers.Add("Access-Control-Allow-Origin", "*")
    $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

    if ($req.HttpMethod -eq "OPTIONS") {
        $res.StatusCode = 200
        $res.Close()
        continue
    }

    if ($req.HttpMethod -eq "GET" -and $req.Url.AbsolutePath -eq "/api/read-file") {
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

    if ($req.HttpMethod -eq "POST" -and $req.Url.AbsolutePath -eq "/api/write-file") {
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

    $res.StatusCode = 404
    $res.Close()
}
