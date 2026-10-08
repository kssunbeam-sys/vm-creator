@echo off
REM Double-click to start Azure VM Creator on Windows.
cd /d "%~dp0"
if not exist .venv (
    echo First run: creating virtual environment and installing dependencies...
    py -3 -m venv .venv || python -m venv .venv
    .venv\Scripts\python -m pip install --upgrade pip
    .venv\Scripts\python -m pip install -r requirements.txt
)
start "" .venv\Scripts\pythonw -m vm_creator
