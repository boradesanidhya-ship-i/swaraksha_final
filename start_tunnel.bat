@echo off
setlocal

echo ========================================================
echo   Starting SWARAKSHA Cloud / Mobile Tunnel
echo ========================================================
echo.
echo Forwarding local port 8000 to a public secure HTTPS URL...
echo Copy the generated URL and paste it into your mobile app Settings.
echo.

npx localtunnel --port 8000

endlocal
