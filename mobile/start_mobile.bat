@echo off
setlocal

set "ROOT=%~dp0"
echo ========================================================
echo   Starting SWARAKSHA Mobile App (Expo SDK 57)
echo ========================================================
echo.
echo Make sure your laptop and mobile device are on the SAME Wi-Fi!
echo Configure your Laptop IP in the mobile app settings.
echo.

cd /d "%ROOT%"
npx expo start

endlocal
