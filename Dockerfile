FROM python:3.12-slim

# Avoid writing .pyc and unbuffer logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies required for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source tree and data fixtures
COPY src/ /app/src/
COPY data/ /app/data/

ENV PYTHONPATH=/app/src
ENV FORESTGUARD_DATA_DIR=/app/data
ENV FORESTGUARD_FIXTURES_DIR=/app/data/fixtures

EXPOSE 8000

CMD ["uvicorn", "forestguard.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
