@echo off
title PommiParty - Kaynnistetaan...
cd /d "%~dp0"
echo.
echo ==========================================
echo   KAYNNISTETAAN POMMIPARTY
echo ==========================================
echo.

:: Automatic desktop shortcut creation
powershell -NoProfile -Command ^
    "$Desktop = [System.Environment]::GetFolderPath('Desktop'); ^
     $Lnk = Join-Path $Desktop 'PommiPeli.lnk'; ^
     if (-not (Test-Path $Lnk)) { ^
         $WshShell = New-Object -ComObject WScript.Shell; ^
         $S = $WshShell.CreateShortcut($Lnk); ^
         $S.TargetPath = '%~dp0Start_PommiParty.bat'; ^
         $S.WorkingDirectory = '%~dp0'; ^
         $S.IconLocation = '%~dp0game_icon.ico'; ^
         $S.Save(); ^
         Write-Host 'Luotiin tyopoytapikakuvake PommiPeli!'; ^
     }"

echo Kaynnistetaan palvelin ja asiakasohjelma...

:: Start the npm run dev command in a separate window or in the background
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
