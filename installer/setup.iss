; GameData Studio - Inno Setup Script
; Build: iscc setup.iss

#define MyAppName "GameData Studio"
#define MyAppVersion "1.7.9"
#define MyAppPublisher "Vinesy"
#define MyAppURL "https://github.com/Vinesy-x/gamedata-studio"
#define MyAddinID "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
#define MyCatalogShare "GameDataStudioCatalog"
#define MyCatalogDir "C:\GameDataStudioCatalog"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
DefaultDirName={userappdata}\GameDataStudio
DefaultGroupName={#MyAppName}
OutputDir=output
OutputBaseFilename=GameDataStudio-Setup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
; admin required for net share
PrivilegesRequired=admin
DisableDirPage=yes
DisableProgramGroupPage=yes
WizardStyle=modern
SetupIconFile=app.ico
UninstallDisplayIcon={app}\app.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Dirs]
Name: "{#MyCatalogDir}"

[Files]
; App icon
Source: "app.ico"; DestDir: "{app}"; Flags: ignoreversion
; Manifest to install dir
Source: "files\manifest.xml"; DestDir: "{app}"; Flags: ignoreversion
; Manifest to shared catalog folder (for Excel Trusted Catalog)
Source: "files\manifest.xml"; DestDir: "{#MyCatalogDir}"; Flags: ignoreversion

; File server scripts
Source: "..\scripts\file-server.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\scripts\start-hidden.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\scripts\diagnose-win.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\scripts\sideload-fix.ps1"; DestDir: "{app}"; Flags: ignoreversion

; Web files (pre-built from dist/)
Source: "..\dist\taskpane.html"; DestDir: "{app}\web"; Flags: ignoreversion
Source: "..\dist\taskpane.bundle.js"; DestDir: "{app}\web"; Flags: ignoreversion
Source: "..\dist\taskpane.bundle.js.LICENSE.txt"; DestDir: "{app}\web"; Flags: ignoreversion
Source: "..\dist\version.txt"; DestDir: "{app}\web"; Flags: ignoreversion
Source: "..\dist\assets\*"; DestDir: "{app}\web\assets"; Flags: ignoreversion

[Icons]
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"; IconFilename: "{app}\app.ico"
Name: "{group}\Diagnose {#MyAppName}"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\diagnose-win.ps1"""; IconFilename: "{app}\app.ico"
Name: "{group}\Fix Sideload {#MyAppName}"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\sideload-fix.ps1"""; IconFilename: "{app}\app.ico"
; Auto-start file server on Windows login (truly hidden via VBS)
Name: "{userstartup}\GameData Studio Server"; Filename: "wscript.exe"; Parameters: """{app}\start-hidden.vbs"""; IconFilename: "{app}\app.ico"

[Registry]
; Method 1: Direct sideloading (Office 2013/2016 fallback)
Root: HKCU; Subkey: "Software\Microsoft\Office\15.0\WEF\Developer\{#MyAddinID}"; ValueType: string; ValueData: "{app}\manifest.xml"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Microsoft\Office\16.0\WEF\Developer\{#MyAddinID}"; ValueType: string; ValueData: "{app}\manifest.xml"; Flags: uninsdeletekey
; Method 2: Trusted Catalog via network share (most reliable for modern Office)
Root: HKCU; Subkey: "Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{#MyCatalogShare}"; ValueType: string; ValueName: "Id"; ValueData: "{#MyCatalogShare}"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{#MyCatalogShare}"; ValueType: string; ValueName: "Url"; ValueData: "\\localhost\{#MyCatalogShare}"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{#MyCatalogShare}"; ValueType: dword; ValueName: "Flags"; ValueData: "1"; Flags: uninsdeletekey

[Run]
; Create network share for catalog (requires admin)
Filename: "net.exe"; Parameters: "share {#MyCatalogShare}={#MyCatalogDir} /grant:everyone,read"; Flags: runhidden; StatusMsg: "Creating catalog share..."
; Start file server after install (truly hidden via VBS)
Filename: "wscript.exe"; Parameters: """{app}\start-hidden.vbs"""; Flags: postinstall nowait skipifsilent runhidden

[UninstallRun]
; Remove network share
Filename: "net.exe"; Parameters: "share {#MyCatalogShare} /delete /yes"; Flags: runhidden
; Stop file server on uninstall
Filename: "taskkill.exe"; Parameters: "/F /IM powershell.exe /FI ""WINDOWTITLE eq GameData*"""; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}\web"
Type: filesandordirs; Name: "{#MyCatalogDir}"

; Note: Uses manifest-online.xml (HTTPS GitHub Pages) — no patching needed
; Network share catalog is the most reliable sideloading method for modern Office
