#!/usr/bin/env bash
# Start Azure VM Creator on macOS / Linux.
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  echo "First run: creating virtual environment and installing dependencies..."
  python3 -m venv .venv
  .venv/bin/python -m pip install --upgrade pip
  .venv/bin/python -m pip install -r requirements.txt
fi
exec .venv/bin/python -m vm_creator "$@"
