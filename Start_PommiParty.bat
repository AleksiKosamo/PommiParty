@echo off
title PommiParty - Kaynnistetaan...
cd /d "%~dp0"
set "SCRIPTDIR=%~dp0"
echo.
echo ==========================================
echo   POMMIPARTY
echo ==========================================
echo.

:: Automatic desktop shortcut creation
powershell -NoProfile -Command "$Desktop = [System.Environment]::GetFolderPath('Desktop'); $Lnk = Join-Path $Desktop 'PommiPeli.lnk'; if (-not (Test-Path $Lnk)) { $WshShell = New-Object -ComObject WScript.Shell; $S = $WshShell.CreateShortcut($Lnk); $S.TargetPath = '%SCRIPTDIR%Start_PommiParty.bat'; $S.WorkingDirectory = '%SCRIPTDIR%'; $IconPath = '%SCRIPTDIR%game_icon.ico'; if (Test-Path $IconPath) { $S.IconLocation = $IconPath; }; $S.Save(); Write-Host 'Luotiin tyopoytapikakuvake PommiPeli!'; }"

echo  1) Yksinpeli / Isannoi moninpelia (kaynnista palvelin)
echo  2) Liity moninpeliin (syota isannan IP)
echo.
set /p CHOICE="Valinta (1 tai 2): "

if "%CHOICE%"=="2" goto JOIN

:HOST
echo.
echo Kaynnistetaan palvelin ja asiakasohjelma...
start "" cmd /c "npm run dev"
echo Odotetaan 6 sekuntia, jotta palvelimet ehtivat kaynnistya...
timeout /t 6 /nobreak >nul
echo Avataan peli selaimessa...
start http://localhost:5173
echo.
echo Valmis! Peli on avattu selaimessa.
echo.
echo Moninpeli: kerro muille pelaajille LAN-osoitteesi (katso konsoliikkuna).
echo.
timeout /t 5
goto END

:JOIN
echo.
set /p HOST_IP="Syota isannan IP-osoite (esim. 192.168.1.5): "
if "%HOST_IP%"=="" (
    echo Virhe: IP-osoite ei voi olla tyhja.
    pause
    goto END
)
echo.
echo Yhdistetaan osoitteeseen http://%HOST_IP%:5173 ...
start http://%HOST_IP%:5173
echo.
echo Peli avattu selaimessa. Liity isannan luomaan huoneeseen!
echo.
timeout /t 5

:END
