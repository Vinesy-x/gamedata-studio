; GameData Studio - Inno Setup Script
; Build: iscc setup.iss

#define MyAppName "GameData Studio"
#define MyAppVersion "1.1.28"
#define MyAppPublisher "Vinesy"
#define MyAppURL "https://github.com/Vinesy-x/gamedata-studio"
#define MyAddinID "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

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
PrivilegesRequired=lowest
DisableDirPage=yes
DisableProgramGroupPage=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; Manifest (HTTP version for Windows)
Source: "files\manifest.xml"; DestDir: "{app}"; Flags: ignoreversion

; File server script
Source: "..\scripts\file-server.ps1"; DestDir: "{app}"; Flags: ignoreversion

; Web files (pre-built from dist/)
Source: "..\dist\taskpane.html"; DestDir: "{app}\web"; Flags: ignoreversion
Source: "..\dist\taskpane.bundle.js"; DestDir: "{app}\web"; Flags: ignoreversion
Source: "..\dist\taskpane.bundle.js.LICENSE.txt"; DestDir: "{app}\web"; Flags: ignoreversion
Source: "..\dist\version.txt"; DestDir: "{app}\web"; Flags: ignoreversion
Source: "..\dist\assets\*"; DestDir: "{app}\web\assets"; Flags: ignoreversion

[Icons]
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
; Auto-start file server on Windows login (hidden window)
Name: "{userstartup}\GameData Studio Server"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\file-server.ps1"""

[Registry]
; Register Office add-in via sideloading
Root: HKCU; Subkey: "Software\Microsoft\Office\16.0\WEF\Developer\{#MyAddinID}"; ValueType: string; ValueData: "{app}\manifest.xml"; Flags: uninsdeletekey

[Run]
; Start file server after install
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\file-server.ps1"""; Description: "Start file server"; Flags: postinstall nowait skipifsilent

[UninstallRun]
; Stop file server on uninstall
Filename: "powershell.exe"; Parameters: "-Command ""Get-Process -ErrorAction SilentlyContinue | Where-Object {{  $_.MainWindowTitle -like '*GameData*File*Server*' }} | Stop-Process -Force"""; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}\web"

[Code]
// Patch manifest: replace https with http for Windows (no dev certs)
procedure PatchManifest;
var
  FileName: String;
  Content: AnsiString;
  ContentStr: String;
begin
  FileName := ExpandConstant('{app}\manifest.xml');
  if LoadStringFromFile(FileName, Content) then
  begin
    ContentStr := String(Content);
    StringChangeEx(ContentStr, 'https://localhost:9876', 'http://localhost:9876', True);
    SaveStringToFile(FileName, AnsiString(ContentStr), False);
  end;
end;

// Patch file-server.ps1: update dataDir and webDir to use install directory
procedure PatchFileServer;
var
  FileName: String;
  Content: AnsiString;
  ContentStr: String;
  AppDir: String;
begin
  FileName := ExpandConstant('{app}\file-server.ps1');
  AppDir := ExpandConstant('{app}');
  if LoadStringFromFile(FileName, Content) then
  begin
    ContentStr := String(Content);
    StringChangeEx(ContentStr, '$dataDir = "$env:USERPROFILE\.gamedata-studio"', '$dataDir = "' + AppDir + '"', True);
    SaveStringToFile(FileName, AnsiString(ContentStr), False);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    PatchManifest;
    PatchFileServer;
  end;
end;
