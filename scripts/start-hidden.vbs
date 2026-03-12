Set WShell = CreateObject("WScript.Shell")
WShell.Run "powershell.exe -ExecutionPolicy Bypass -File """ & Replace(WScript.ScriptFullName, "start-hidden.vbs", "file-server.ps1") & """", 0, False
