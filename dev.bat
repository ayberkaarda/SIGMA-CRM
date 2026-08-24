@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================
echo  Syncra - Gelistirme Ortami Baslatiliyor
echo ============================================
echo.

REM --- PHP PATH kontrolu -----------------------------------------------
where php >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PHP=php"
) else (
    set "PHP=C:\xampp\php\php.exe"
    echo [UYARI] "php" komutu PATH'te bulunamadi. Tam yol kullanilacak: !PHP!
)

REM --- MySQL port kontrolu (3306) ----------------------------------------
netstat -an | findstr ":3306" | findstr "LISTENING" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [UYARI] MySQL 3306 portunda calismiyor gibi gorunuyor.
    echo         XAMPP Control Panel'den MySQL servisini baslatin.
) else (
    echo [OK] MySQL 3306 portunda calisiyor.
)

REM --- Redis port kontrolu (6379) -----------------------------------------
netstat -an | findstr ":6379" | findstr "LISTENING" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [UYARI] Redis 6379 portunda calismiyor gibi gorunuyor.
    echo         WSL icinde "sudo service redis-server start" komutunu calistirin.
) else (
    echo [OK] Redis 6379 portunda calisiyor.
)

echo.
echo Devam etmek icin bir tusa basin (uyarilar varsa once servisleri baslatmaniz onerilir)...
pause >nul
echo.

REM --- Surecleri ayri pencerelerde baslat ---------------------------------
echo API baslatiliyor (port 8000)...
start "Syncra API" cmd /k "cd /d "%~dp0backend" && "%PHP%" artisan serve"

echo Reverb (WebSocket) baslatiliyor (port 8080)...
start "Syncra Reverb" cmd /k "cd /d "%~dp0backend" && "%PHP%" artisan reverb:start"

echo Queue worker baslatiliyor...
start "Syncra Queue" cmd /k "cd /d "%~dp0backend" && "%PHP%" artisan queue:work"

echo Frontend baslatiliyor (port 5173)...
start "Syncra Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ============================================
echo  Tum surecler baslatildi.
echo    API      : http://localhost:8000
echo    Frontend : http://localhost:5173
echo    Reverb   : ws://localhost:8080
echo ============================================
echo.

endlocal
