; Commit Sage NSIS Installer Script
; Requires NSIS: https://nsis.sourceforge.io/

!include "MUI2.nsh"
!include "FileFunc.nsh"

; General
Name "Commit Sage"
OutFile "..\..\release\commit-sage-setup.exe"
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
  File "..\..\bin\commit-sage-windows-x64.exe"
  
  ; Store installation folder
  WriteRegStr HKLM "Software\commitSage" "InstallDir" "$INSTDIR"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  ; Add to PATH
  DetailPrint "Adding to PATH..."
  ReadRegStr $0 HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "Path"
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
