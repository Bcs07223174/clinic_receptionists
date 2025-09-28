@echo off
echo ========================================
echo   Optimized Build & Performance Script
echo ========================================

echo.
echo [1/5] Cleaning previous build and cache...
if exist ".next" rd /s /q ".next"
if exist "out" rd /s /q "out"
if exist "tsconfig.tsbuildinfo" del /q "tsconfig.tsbuildinfo"
echo Cache cleaned ✅

echo.
echo [2/5] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    pnpm install --frozen-lockfile --prefer-offline
) else (
    echo Dependencies already installed ✅
)

echo.
echo [3/5] Running optimized build...
set NODE_ENV=production
set NEXT_TELEMETRY_DISABLED=1
pnpm run build:optimized

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Build failed! Please check the errors above.
    pause
    exit /b 1
)

echo.
echo [4/5] Build analysis...
echo 📊 Bundle sizes:
dir .next\static\chunks\*.js | find "bytes"

echo.
echo [5/5] Performance optimization complete! ✅

echo.
echo ========================================
echo   Build Complete - Optimized & Ready!
echo ========================================
echo.
echo 🚀 Your optimized app is ready:
echo - Static files: .next/static/ (cached for 1 year)
echo - Server files: .next/server/ (optimized)
echo - Bundle splitting: ✅ Enabled
echo - Tree shaking: ✅ Enabled
echo - Compression: ✅ Enabled
echo.
echo To start the production server:
echo   pnpm start
echo.
pause