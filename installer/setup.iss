; GameData Studio - Inno Setup Script
; Build: iscc setup.iss

#define MyAppName "GameData Studio"
#define MyAppVersion "1.1.31"
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
; Manifest (HTTP version for Windows, pre-patched in CI)
Source: "files\manifest.xml"; DestDir: "{app}"; Flags: ignoreversion

; File server scripts
Source: "..\scripts\file-server.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\scripts\start-hidden.vbs"; DestDir: "{app}"; Flags: ignoreversion

; Web files (pre-built from dist/)
Source: "..\dist\taskpane.html"; DestDir: "{app}\web"; Flags: ignoreversion
Source: "..\dist\taskpane.bundle.js"; DestDir: "{app}\web"; Flags: ignoreversion
Source: "..\dist\taskpane.bundle.js.LICENSE.txt"; DestDir: "{app}\web"; Flags: ignoreversion
Source: "..\dist\version.txt"; DestDir: "{app}\web"; Flags: ignoreversion
Source: "..\dist\assets\*"; DestDir: "{app}\web\assets"; Flags: ignoreversion

[Icons]
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
; Auto-start file server on Windows login (truly hidden via VBS)
Name: "{userstartup}\GameData Studio Server"; Filename: "wscript.exe"; Parameters: """{app}\start-hidden.vbs"""

[Registry]
; Register Office add-in via sideloading (try both 16.0 and 15.0)
Root: HKCU; Subkey: "Software\Microsoft\Office\16.0\WEF\Developer\{#MyAddinID}"; ValueType: string; ValueData: "{app}\manifest.xml"; Flags: uninsdeletekey

[Run]
; Start file server after install (truly hidden via VBS)
Filename: "wscript.exe"; Parameters: """{app}\start-hidden.vbs"""; Flags: postinstall nowait skipifsilent runhidden

[UninstallRun]
; Stop file server on uninstall
Filename: "taskkill.exe"; Parameters: "/F /IM powershell.exe /FI ""WINDOWTITLE eq GameData*"""; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}\web"

[Code]
// Patch manifest: replace https with http for Windows (no dev certs)
procedure CurStepChanged(CurStep: TSetupStep);
var
  FileName: String;
  Content: AnsiString;
  ContentStr: String;
begin
  if CurStep = ssPostInstall then
  begin
    FileName := ExpandConstant('{app}\manifest.xml');
    if LoadStringFromFile(FileName, Content) then
    begin
      ContentStr := String(Content);
      StringChangeEx(ContentStr, 'https://localhost:9876', 'http://localhost:9876', True);
      SaveStringToFile(FileName, AnsiString(ContentStr), False);
    end;
  end;
end;
