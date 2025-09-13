#!/bin/bash

# Start Django development server
echo "Starting Django server on port 8001..."
cd django_app
python manage.py runserver 0.0.0.0:8001 &

# Start FastAPI server
echo "Starting FastAPI server on port 8000..."
cd ../fastapi_app
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &

echo "Both servers are running:"
echo "- Django: http://localhost:8001"
echo "- FastAPI: http://localhost:8000"
echo "- API Documentation: http://localhost:8000/docs"

wait
