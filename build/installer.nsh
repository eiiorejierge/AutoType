; ─────────────────────────────────────────────────────────────────────────────
;  AutoType — Custom NSIS Installer Script
;  Included by electron-builder during the Windows installer build.
; ─────────────────────────────────────────────────────────────────────────────

; ── Welcome page overrides ────────────────────────────────────────────────────
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE       "Welcome to AutoType"
  !define MUI_WELCOMEPAGE_TEXT        "AutoType simulates natural human typing.$\r$\n$\r$\nPaste any text, choose your WPM and accuracy, then watch it type — character by character — with realistic timing and occasional auto-corrected typos.$\r$\n$\r$\nClick Next to continue."
!macroend

; ── Finish page overrides ─────────────────────────────────────────────────────
!macro customFinishPage
  !define MUI_FINISHPAGE_TITLE        "AutoType is ready."
  !define MUI_FINISHPAGE_TEXT         "Installation complete.$\r$\n$\r$\nClick Finish to launch AutoType."
  !define MUI_FINISHPAGE_RUN          "$INSTDIR\AutoType.exe"
  !define MUI_FINISHPAGE_RUN_TEXT     "Launch AutoType now"
!macroend

; ── Post-install step (runs silently after files are copied) ──────────────────
!macro customInstall
  ; Nothing extra needed — electron-builder handles shortcuts.
!macroend
