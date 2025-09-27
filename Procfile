web: cd backend && gunicorn fastapi_app.main:app --bind 0.0.0.0:$PORT --worker-class uvicorn.workers.UvicornWorker --workers 2
worker: python start_worker.py
