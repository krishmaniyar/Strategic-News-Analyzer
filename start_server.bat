@echo off
cd backend
call conda activate computer_vision || echo Activate manually if needed
python -m uvicorn app.main:app --reload --port 8000
