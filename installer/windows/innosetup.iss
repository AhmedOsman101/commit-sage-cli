; Commit Sage Inno Setup Script
; Download Inno Setup: https://jrsoftware.org/isinfo.php

#define MyAppName "Commit Sage"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Commit Sage"
#define MyAppURL "https://github.com/AhmedOsman101/commit-sage-cli"
#define MyAppExeName "commit-sage-windows-x64.exe"

[Setup]
AppId={{F8C7E6D4-9A2B-4C8F-1E3D-5A6B7C8D9E0F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=..\release
OutputBaseFilename=commit-sage-{#MyAppVersion}-windows-x64
SetupIconFile=
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "addpath"; Description: "Add to PATH"; GroupDescription: "PATH Options:"

[Files]
Source: "..\bin\commit-sage-windows-x64.exe"; DestDir: "{app}"; DestName: "commit-sage.exe"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\commit-sage.exe"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\commit-sage.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\commit-sage.exe"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Registry]
; Add to PATH if task selected - prepend app directory to user PATH
Root: HKCU; Subkey: "Environment"; ValueType: string; ValueName: "Path"; ValueData: "{app};{reg:HKCU\Environment\Path}"; Flags: uninsdeletevalue; Tasks: addpath
