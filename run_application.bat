@echo off
title Submeter Billing Launcher
mode con: cols=70 lines=20

echo ==============================================================
echo     STARTING SUBMETER BILLING CALCULATOR SYSTEM
echo ==============================================================
echo.
echo Note: Your database (Supabase) is hosted online in the cloud,
echo       so it is already running and ready!
echo.
echo [1/2] Launching Spring Boot Backend API...
start "Submeter Backend API Server" /d "%~dp0backend" cmd /c ".\mvnw.cmd spring-boot:run"

echo.
echo Waiting for backend server initialization...
timeout /t 6 /nobreak > nul

echo.
echo [2/2] Launching React Frontend UI...
start "Submeter Frontend Dev Client" /d "%~dp0frontend" cmd /c "npm start"

echo.
echo ==============================================================
echo     SUCCESS: System started! Opening http://localhost:3000
echo ==============================================================
echo.
echo You can close this window now. Keep the other two terminal 
echo windows open while using the application.
echo.
timeout /t 5
exit
