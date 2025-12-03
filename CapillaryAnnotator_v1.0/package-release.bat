@echo off
REM Package the application for distribution (Windows version)

set PACKAGE_NAME=CapillaryAnnotator_v1.0
set DIST_DIR=release

echo Creating distribution package: %PACKAGE_NAME%
echo ================================================
echo.

REM Clean up any previous release
if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"
mkdir "%DIST_DIR%\%PACKAGE_NAME%"

REM Copy essential files (NO node_modules or symlinks)
echo Copying application files...
xcopy /E /I /Y dist "%DIST_DIR%\%PACKAGE_NAME%\dist\" >nul
xcopy /E /I /Y docs "%DIST_DIR%\%PACKAGE_NAME%\docs\" >nul
if exist server xcopy /E /I /Y server "%DIST_DIR%\%PACKAGE_NAME%\server\" >nul
xcopy /E /I /Y public "%DIST_DIR%\%PACKAGE_NAME%\public\" >nul

REM Copy batch files
if exist *.bat copy *.bat "%DIST_DIR%\%PACKAGE_NAME%\" >nul

REM Copy documentation
copy README.md "%DIST_DIR%\%PACKAGE_NAME%\" >nul
copy package.json "%DIST_DIR%\%PACKAGE_NAME%\" >nul

REM Copy source files
echo Copying source files...
xcopy /E /I /Y src "%DIST_DIR%\%PACKAGE_NAME%\src\" >nul
copy index.html "%DIST_DIR%\%PACKAGE_NAME%\" >nul
copy vite.config.ts "%DIST_DIR%\%PACKAGE_NAME%\" >nul
copy tsconfig*.json "%DIST_DIR%\%PACKAGE_NAME%\" >nul
if exist postcss.config.js copy postcss.config.js "%DIST_DIR%\%PACKAGE_NAME%\" >nul
if exist tailwind.config.js copy tailwind.config.js "%DIST_DIR%\%PACKAGE_NAME%\" >nul

echo.
echo Creating README for distribution...
(
echo # Installation Instructions
echo.
echo ## For End Users ^(No Development^)
echo 1. Double-click START_SERVER.bat
echo 2. The application will open in your browser
echo 3. Use Chrome, Edge, or Opera
echo.
echo ## For Developers
echo 1. Install Node.js from nodejs.org
echo 2. Open terminal in this folder
echo 3. Run: npm install
echo 4. Run: npm run dev
echo.
echo See README.md for full documentation.
) > "%DIST_DIR%\%PACKAGE_NAME%\INSTALL.txt"

echo.
echo ================================================
echo Done! Package created in: %DIST_DIR%\%PACKAGE_NAME%
echo.
echo To create ZIP file:
echo   1. Right-click the folder: %DIST_DIR%\%PACKAGE_NAME%
echo   2. Select "Send to" ^> "Compressed (zipped) folder"
echo.
echo OR use 7-Zip/WinRAR to create the archive.
echo.
pause
