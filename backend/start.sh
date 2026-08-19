#!/usr/bin/env bash
# Signal — one-command backend start (macOS / Linux).
# Creates the virtualenv on first run, installs deps, starts uvicorn on :8000.
set -e
cd "$(dirname "$0")"

if [ ! -d venv ]; then
  echo ">> creating virtualenv..."
  python3 -m venv venv
fi

# shellcheck disable=SC1091
source venv/bin/activate

echo ">> installing dependencies..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

echo ">> starting Signal API at http://localhost:8000 (health: /api/health)"
uvicorn main:app --reload --port 8000
