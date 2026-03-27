@echo off
title Capillaroscopy Annotator Server
set serve=server\miniserve-0.32.0-i686-pc-windows-msvc.exe
color 0A
echo.
echo ================================================
echo   Nailfold Capillaroscopy Annotator
echo ================================================
echo.
echo Starting server...
echo.
echo The application will open in your browser.
echo To stop the server, close this window or press Ctrl+C
echo.
start http://localhost:8080
%serve% dist --port 8080 --index index.html --spa
