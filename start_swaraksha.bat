@echo off
setlocal

set "ROOT=%~dp0"
set "PYTHON=C:\Users\Sora\AppData\Local\Programs\Python\Python311\python.exe"

if not exist "%PYTHON%" (
    echo Python 3.11 was not found at:
    echo %PYTHON%
    pause
    exit /b 1
)

"%PYTHON%" -c "import fastapi, cv2, tensorflow, torch, faiss, deepface, retinaface, tf_keras, transformers" >nul 2>&1
if errorlevel 1 (
    echo Backend dependencies are missing. Installing them for Python 3.11...
    "%PYTHON%" -m pip install -r "%ROOT%requirements.txt"
    if errorlevel 1 (
        echo Backend dependency installation failed.
        pause
        exit /b 1
    )
)

start "SWARAKSHA Backend" /D "%ROOT%" cmd /k ""%PYTHON%" -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000"
start "SWARAKSHA Frontend" /D "%ROOT%frontend" cmd /k npm.cmd run dev -- --host 127.0.0.1

echo SWARAKSHA v2 started.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
endlocal
