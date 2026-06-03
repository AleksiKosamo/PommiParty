@echo off
title PommiParty - Kaynnistetaan...
cd /d "%~dp0"
echo.
echo ==========================================
echo   KAYNNISTETAAN POMMIPARTY
echo ==========================================
echo.
echo Kaynnistetaan palvelin ja asiakasohjelma...

:: Start the npm run dev command in a separate window or in the background
:: We use start cmd /k so it stays open or run in background
start "" cmd /c "npm run dev"

echo Odotetaan 4 sekuntia, jotta palvelimet ehtivat kaynnistya...
timeout /t 4 /nobreak >nul

echo Avataan peli selaimessa...
start http://localhost:5173

echo.
echo Valmis! Peli on avattu selaimessa.
echo Voit sulkea peli-palvelimet sulkemalla erillisen komentorivi-ikkunan.
echo.
timeout /t 5
