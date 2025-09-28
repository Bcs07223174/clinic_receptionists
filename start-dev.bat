@echo off
echo 🔍 Checking for existing Node.js processes...

:: Kill existing Node.js processes
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" ^| find "node.exe"') do (
    echo 🔴 Killing Node.js process: %%i
    taskkill /F /PID %%i >nul 2>&1
)

echo ✅ Cleanup completed
echo 🚀 Starting development server...

pnpm run dev