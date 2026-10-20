@echo off
setlocal
cd /d "%~dp0"
REM Open as a maximized standalone browser window where possible.
for %%P in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%LocalAppData%\Microsoft\Edge\Application\msedge.exe"
) do (
  if exist "%%~P" (
    start "Neon Worm v6.4 Mobile" "%%~P" --new-window --start-maximized "%~dp0index.html"
    exit /b 0
  )
)
start "" /max "%~dp0index.html"
