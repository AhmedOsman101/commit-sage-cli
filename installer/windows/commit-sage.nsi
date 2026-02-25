; Commit Sage NSIS Installer Script
; Requires NSIS: https://nsis.sourceforge.io/

!include "MUI2.nsh"
!include "FileFunc.nsh"

; General
Name "Commit Sage"
OutFile "../../release/commit-sage-setup.exe"
InstallDir "$PROGRAMFILES\commitSage"
InstallDirRegKey HKLM "Software\commitSage" "InstallDir"
RequestExecutionLevel admin

; Version info
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "Commit Sage"
VIAddVersionKey "CompanyName" "Commit Sage"
VIAddVersionKey "FileDescription" "Commit Sage Installer"
VIAddVersionKey "FileVersion" "1.0.0"
VIAddVersionKey "ProductVersion" "1.0.0"
VIAddVersionKey "LegalCopyright" "Commit Sage"

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language
!insertmacro MUI_LANGUAGE "English"

; Installer Section
Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Install binary
  File "../../bin/commit-sage-windows-x64.exe"
  
  ; Store installation folder
  WriteRegStr HKLM "Software\commitSage" "InstallDir" "$INSTDIR"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  ; Add to PATH
  DetailPrint "Adding to PATH..."
  ReadRegStr $0 HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "Path"
  
  ; Check if already in PATH
  StrCpy $1 "$0;$INSTDIR"
  StrCmp $0 "$INSTDIR" +2
  StrCmp $0 "" +2
  StrCpy $1 "$0;$INSTDIR"
  
  WriteRegExpandStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "Path" "$1"
  
  ; Notify Windows of PATH change
  System::Call 'Kernel32::SendMessageTimeoutA(i 0xffff, i 0x001A, i 0, t "Environment", i 2, i 5000, i r0)'
  
  ; Start Menu shortcuts
  CreateDirectory "$SMPROGRAMS\Commit Sage"
  CreateShortCut "$SMPROGRAMS\Commit Sage\Commit Sage.lnk" "$INSTDIR\commit-sage-windows-x64.exe"
  CreateShortCut "$SMPROGRAMS\Commit Sage\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  
  ; Desktop shortcut
  CreateShortCut "$DESKTOP\Commit Sage.lnk" "$INSTDIR\commit-sage-windows-x64.exe"
SectionEnd

; Uninstaller Section
Section "Uninstall"
  ; Remove from PATH
  ReadRegStr $0 HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "Path"
  
  ; Remove install dir from PATH
  StrCpy $1 ""
  StrCpy $2 ""
  
  ; Simple PATH cleanup - remove INSTDIR from PATH
  StrCpy $0 "$0;"
  StrLen $3 "$INSTDIR"
  loop:
    StrCpy $2 $0 1
    StrCpy $0 $0 1 ""
    StrCmp $2 "" done
    StrCmp $2 ";" found
    goto loop
  found:
    StrCpy $1 $0
    StrCpy $0 $1 1 -1
    StrCmp $0 ";" +1 loop
    StrCpy $1 $1 -1
    WriteRegExpandStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "Path" "$1"
  
  ; Notify Windows
  System::Call 'Kernel32::SendMessageTimeoutA(i 0xffff, i 0x001A, i 0, t "Environment", i 2, i 5000, i r0)'
  
  ; Remove files
  Delete "$INSTDIR\commit-sage-windows-x64.exe"
  Delete "$INSTDIR\uninstall.exe"
  
  ; Remove shortcuts
  Delete "$SMPROGRAMS\Commit Sage\Commit Sage.lnk"
  Delete "$SMPROGRAMS\Commit Sage\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Commit Sage"
  Delete "$DESKTOP\Commit Sage.lnk"
  
  ; Remove install directory
  RMDir "$INSTDIR"
  
  ; Remove registry keys
  DeleteRegKey HKLM "Software\commitSage"
SectionEnd
