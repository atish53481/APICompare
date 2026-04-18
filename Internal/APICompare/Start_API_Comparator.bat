@echo off
echo Starting API Comparator - Migration Validator...
echo Connecting to Node.js server...
cd /d %~dp0
npm start
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] Failed to start. Please ensure Node.js is installed.
  echo If you don't have Node.js, try Method 2 (Python) in README.md.
)
pause
