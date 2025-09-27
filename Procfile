web: gunicorn fastapi_app.main:app --bind 0.0.0.0:$PORT --workers 2
worker: python start_worker.py
