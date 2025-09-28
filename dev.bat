@echo off
echo 🚀 Starting Clinic Receptionist Development Server...
echo.
echo 📋 Available commands:
echo   - pnpm run dev (normal start)
echo   - start-dev.bat (auto-cleanup conflicting processes)
echo.

:: Check if port 3000 is available
netstat -ano | find ":3000" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ⚠️ Port 3000 appears to be in use
    echo 🔧 The server will automatically find an available port
    echo.
)

pnpm run dev