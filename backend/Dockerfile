# Build context must be the repo root (set in docker-compose.yml)
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend package
COPY backend/ ./backend/

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
