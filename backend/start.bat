@echo off
rem Signal — one-command backend start (Windows).
rem Creates the virtualenv on first run, installs deps, starts uvicorn on :8000.
cd /d "%~dp0"

if not exist venv (
  echo ^>^> creating virtualenv...
  python -m venv venv
)

call venv\Scripts\activate.bat

echo ^>^> installing dependencies...
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt

echo ^>^> starting Signal API at http://localhost:8000 (health: /api/health)
uvicorn main:app --reload --port 8000
